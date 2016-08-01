# KanbanParPeople
小規模プロジェクトのための人別カンバンのプロトタイプ  

## Development

### Require

- node@~6
- mongodb
- npm
- bower
- ruby
- sass
- compass

*test*
- mocha

### Run

- `git clone git@...`
- `compass compile`
- `npm install`
- `bower install`
- `cp config/default.json config/development.json` or `cp config/default.json config/production.json` and edit
- `npm start`

### Test

- `cp config/default.json config/test.json` and edit
- `mocha lib/spec/**/* --timeout 10000`
