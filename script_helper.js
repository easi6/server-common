const {spawn} = require('child_process');
const Promise = require('bluebird');

const execMigrationScript = (fileName) => {
  const migrationProcess = spawn('node', ['-r', 'regenerator-runtime/runtime', '-r', 'babel-register', `./migration_scripts/${fileName}.js`], {cwd: __dirname + '/../..'});
  return new Promise((rs, rj) => {
    migrationProcess.stdout.on('data', data => console.log(data.toString()));
    migrationProcess.stderr.on('data', data => console.error(data.toString()));
    return migrationProcess.on('close', function(code) {
      if (code === 0) {
        return rs();
      } else {
        return rj(code);
      }
    });
  })
};

module.exports = {
  execMigrationScript: execMigrationScript,
};
