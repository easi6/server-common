import elasticsearch from 'elasticsearch';
import config from 'config';
import _ from 'lodash';
import Promise from 'bluebird';
import { Model, DataTypes } from 'sequelize';
import logger from '../../config/logger';

let esClient;
if (config.eshost) {
  esClient = new elasticsearch.Client({
    host: config.eshost,
    log: 'trace',
  });
}

export default (model, opts) => {
  if (!esClient) {
    logger.warn('config.eshost does not exist or esClient is not set. Model.esSearch will return empty array');
    model.esSearch = (originalQuery, searchOpts) => {
      logger.warn('Since esClient is not set, this method just return empty array!');
      if (searchOpts.paginate) {
        return Promise.resolve({ count: 0, rows: [] });
      }
      return Promise.resolve([]);
    };
    return;
  }

  const defaultOpts = { propagateUpdate: [], include: [] };
  opts = _.extend(defaultOpts, opts);

  const indexName = `${opts.indexPrefix || ''}:` + model.tableName;
  esClient.indices
    .exists({
      index: indexName,
    })
    .then(
      exists =>
        !exists &&
        esClient.indices.create({
          index: indexName,
        })
    );

  model.prototype._toESDoc = function() {
    return this.toESDoc ? this.toESDoc() : this.get({ role: 'admin' });
  };

  model.prototype.addES = function() {
    return Promise.fromCallback(cb => {
      return Promise.resolve(this._toESDoc()) // admin role이 가장 많은 field를 갖고 있으므로.
        .then(doc =>
          esClient.index(
            {
              index: indexName,
              type: 'default',
              id: this.id,
              body: doc,
            },
            cb
          )
        );
    });
  };

  model.prototype.removeES = function() {
    return Promise.fromCallback(cb => {
      return esClient.delete(
        {
          index: indexName,
          type: 'default',
          id: this.id,
        },
        cb
      );
    });
  };

  model.hook('afterCreate', 'insertToES', (instance, opts) => {
    const { transaction } = opts;
    const cb = () => instance.addES();
    transaction ? transaction.afterCommit(cb, true) : setTimeout(cb);
  });

  model.hook('afterUpdate', 'updateToES', (instance, opts) => {
    const { transaction } = opts;
    const cb = () => instance.addES();
    transaction ? transaction.afterCommit(cb, true) : setTimeout(cb);
  });

  model.hook('afterDestroy', 'deleteFromES', (instance, opts) => {
    const { transaction } = opts;
    const cb = () => instance.removeES();
    transaction ? transaction.afterCommit(cb, true) : setTimeout(cb);
  });

  // opts.propagateUpdate에 등록된 모델이 association에 있는 애들이면 현재 모델이 업데이트 됐을때 해당 모델에 대한 인덱스를 다시 수행
  opts.propagateUpdate &&
    _.castArray(opts.propagateUpdate).forEach(targetName => {
      _.forEach(model.associations, association =>
        (function(association) {
          if (association.target.name !== targetName) return;

          const targetModel = association.target;

          if (association.associationType === 'HasMany' || association.associationType === 'BelongsTo') {
            const fname = association.accessors.get;
            model.hook(
              'afterUpdate',
              `update${targetModel.name}ToES`,
              (function(fname) {
                return (instance, opts) => {
                  const { transaction } = opts;
                  const cb = () =>
                    instance[fname]().then(targets => {
                      return Promise.map(_.castArray(targets), target => target.addES && target.addES());
                    });
                  transaction ? transaction.afterCommit(cb, true) : setTimeout(cb);
                };
              })(fname)
            );
          } else {
            throw new Error('only HasMany or BelongsTo relation target can be auto re-indexed');
          }
        })(association)
      );
    });

  model._indexAll2ES = function() {
    return model.findAll().then(allInstances => {
      return Promise.reduce(
        allInstances,
        (acc, instance) =>
          Promise.resolve(instance._toESDoc()).then(doc => [
            ...acc,
            {
              index: { _index: indexName, _type: 'default', _id: instance.id },
            },
            doc,
          ]),
        []
      ).then((
        body // then of Promise.reduce
      ) => Promise.fromCallback(cb => esClient.bulk({ body }, cb)));
    });
  };

  model._getESQuery = function(originalQuery, opts = { paginate: true, page: 1, limit: 20, operator: '$and' }) {
    originalQuery = _.reduce(
      originalQuery,
      (acc, v, k) => {
        if (!!v) {
          acc = { ...acc, [k]: v };
        }
        return acc;
      },
      {}
    );

    const mustConditions = [];

    if (originalQuery.company_id) {
      mustConditions.push({ term: { company_id: originalQuery.company_id } });
    }

    const query = _.omit(originalQuery, 'company_id');

    const specialChars =
      '([' +
      '+ - = & | ! ( ) { } [ ] ^ " ~ * ? : \\ /'
        .split(' ')
        .map(x => `\\${x}`)
        .join('') +
      '])';
    const regex = new RegExp(specialChars, 'g');
    const regex2 = /[<>]/g;
    const escapeString = str => str.replace(regex2, '').replace(regex, '\\$1');

    function obj2esquery(queryObj) {
      /*
      queryObj는 키가 한개밖에 없는 object로써 다음의 경우 중 하나다
      <queryObj> := | {<op>: [<queryObj>]
                    | {field: q}
      <op>는 $and 또는 $or 이다
      {field: q}는 다음과 같이 변환한다.

      1) q.type == 'text'
        * q.wildcard == 'both'
          "field: *{q.value}*"
        * q.wildcard == 'prefix'
          "field: {q.value}*"
        * q.wildcard == 'postfix'
          "field: *{q.value}" // 용례: 전화번호 뒷자리
        * q.wildcard == false
          "field: q" // exact match

      2) q.type == 'range'
        * "field: [ ${q.value[0]}, ${q.value[1]} ]"

      op로 연결된 query들은 op를 infix로 넣어서 결합한다.
      */

      const key = Object.keys(queryObj)[0];
      if (key === '$or' || key === '$and') {
        const arr = queryObj[key];
        return '(' + arr.map(q => obj2esquery(q)).join(` ${key.replace('$', '').toUpperCase()} `) + ')';
      } else {
        const q = queryObj[key];

        if (q.type === 'text') {
          const v = q.value;
          return (
            `(${key}: ${q.wildcard === 'both' || q.wildcard === 'postfix' ? '*' : ''}` +
            (typeof v === 'string'
              ? v
                  .split(/[\s-]+/)
                  .map(s => escapeString(s))
                  .join(' AND ')
              : v) +
            `${q.wildcard === 'both' || q.wildcard === 'prefix' ? '*' : ''})`
          );
        } else if (q.type === 'range') {
          const [from, to] = q.value;
          return `(${key}: [${from} TO ${to}])`;
        }
      }
    }

    function convertQueryObj(queryObj) {
      /*
      queryObj의 각 k,v 쌍은 다음의 경우 중 하나다
      <elem> := | {<op>: [...] | {}}
                | {field: q} => q가 스트링인 경우. value, wildcard, type 형태로 변환함
                | {field: {value, wildcard, type}
      이 함수는 queryObj의 각 object 형태를 키가 한개인 형태로 변환한다
      op가 없이 그냥 연결하면 $and op로 취급한다.
       */

      // trivial case
      if (_.isEmpty(queryObj)) {
        return queryObj;
      }

      if (Object.keys(queryObj).length === 1) {
        const key = Object.keys(queryObj)[0];
        if (key === '$or' || key === '$and') {
          let subQuery = queryObj[key];
          if (_.isObject(subQuery)) {
            if (!_.isArray(subQuery)) {
              subQuery = _.reduce(
                subQuery,
                (acc, v, k) => {
                  return [...acc, { [k]: v }];
                },
                []
              );
            }
          } else {
            throw new Error('plain value with $or or $and operator is not supported');
          }
          return { [key]: subQuery.map(s => convertQueryObj(s)) };
        } else {
          const key = Object.keys(queryObj)[0];
          let value = queryObj[key];
          if (typeof value !== 'object') {
            value = { value: value, type: 'text', wildcard: 'both' };
          } else {
            if (!value.value) {
              throw new Error('invalid search query. value must be defined');
            }

            if (value.type === 'text' || !value.type) {
              value = { type: 'text', wildcard: 'both', ...value };
            } else if (value.type === 'range') {
              if (!(_.isArray(value.value) && value.value.length === 2)) {
                throw new Error('invalid search value. should be an array having length of 2');
              }
            } else {
              throw new Error('invalid search query type. only support term and range but got ' + value.type);
            }
          }
          return { [key]: value };
        }
      }

      return {
        $and: _.reduce(queryObj, (acc, v, k) => [...acc, convertQueryObj({ [k]: v })], []),
      };
    }

    if (!_.isEmpty(query)) {
      const querystring = obj2esquery(convertQueryObj({ [opts.operator]: query }));
      mustConditions.push({ query_string: { query: querystring } });
    }

    return {
      query: {
        constant_score: {
          filter: {
            bool: {
              must: mustConditions,
            },
          },
        },
      },
    };
  };

  const includeOptions = opts.include;
  model.esSearch = function(originalQuery, searchOpts) {
    let defaultOpts = {
      paginate: true,
      page: 1,
      limit: 20,
      operator: '$and',
      sort: [['id', 'desc']],
    };
    searchOpts = _.assign(defaultOpts, searchOpts);
    const esquery = model._getESQuery(originalQuery, searchOpts);
    const searchParam = {
      index: indexName,
      body: esquery,
      sort: searchOpts.sort.map(s => `${s[0]}:${s[1]}`),
      size: 100,
    }; // ES search 결과는 100개 제한
    if (searchOpts.paginate) {
      _.extend(searchParam, {
        from: (searchOpts.page - 1) * searchOpts.limit,
        size: searchOpts.limit,
      });
    }
    return Promise.fromCallback(cb => esClient.search(searchParam, cb)).then(result => {
      const results = _.map(_.get(result, 'hits.hits') || [], '_source').map(doc =>
        // try to build an instance from doc
        model.build(doc, { include: includeOptions })
      );

      if (searchOpts.paginate) {
        return { count: result.hits.total, rows: results };
      } else {
        return results;
      }
    });
  };
};
