var fs = require('fs');
var _ = require('lodash');
require('date-utils');
var async = require('async');

var STORE_PATH = __dirname + '/store/taskLeadTimeTSV';

if (process.argv.length < 3) {
    console.error('error: required source file path at the third argument');
    process.exit(1);
}

main(process.argv[2]);

function main(sourcePath) {
    var source = readSource(sourcePath);
    var result = analyze(source.project, source.issueLogs);
    var out = format(source.project, result);
    dumpTSV(source.project, out);
}

function readSource(sourcePath) {
    //console.log('read: ' + sourcePath);
    var source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    //console.log(JSON.stringify({projectId: source.project.id, projectName: source.project.name}));
    return source;
}

function analyze(project, issueLogs) {
    return issueLogs
        .filter(_.partial(haveAStage, _, 'todo'))
        .filter(_.partial(haveAStage, _, 'done'))
        .map(function (issue) {
            var datetimes = {};
            datetimes.firstToDoTime = _.chain(issue.logs).where({stage: 'todo'}).pluck('created_at').map(function (x) { return new Date(x); }).min().value();
            datetimes.lastDoneTime  = _.chain(issue.logs).where({stage: 'done'}).pluck('created_at').map(function (x) { return new Date(x); }).max().value();
            datetimes.leadTimeHour = _.ceil((datetimes.lastDoneTime - datetimes.firstToDoTime) / (1000 * 60 * 60), 2);

            return _.extend(issue, datetimes);
        });
}

function format(project, issues) {
    return issues.map(function (issue) {
        return {
            title: issue.title,
            leadTimeHour: issue.leadTimeHour,
            firstToDoTime: dateToFormat(issue.firstToDoTime),
            lastDoneTime: dateToFormat(issue.lastDoneTime),
            assignees: _.chain(issue.logs).pluck('assignee').compact().unique().map(_.partial(findMemberById, project))
                .pluck('user').pluck('userName').value().join(',')
        };
    });
}

function dumpTSV(project, values) {
    if (values.length === 0) {
        return console.error('no data');
    }

    var header = Object.keys(values[0]);
    var rows = _.chain(values).map(_.partial(_.pick, _, header)).map(_.values).value();
    var out = [header].concat(rows).map(function (x) { return x.join('\t'); }).join('\n');

    var fileFormat = _.template('{projectName}_{projectId}_{datetime}.tsv',
        {interpolate: /{([\s\S]+?)}/g});
    var path = STORE_PATH + '/' + fileFormat({
            projectName: project.name,
            projectId: project.id,
            datetime: (new Date()).toFormat('YYMMDD_HH24MISS')
        });

    fs.writeFileSync(path, out);
    console.log('created: ' + path);
}

function findMemberById(project, id) {
    return _.find(project.members, function (member) {
        return member.user._id === id;
    });
}

function haveAStage(issue, stage) {
    return _.chain(issue.logs).pluck('stage').includes(stage).value();
}

function dateToFormat(date) {
    return (new Date(date)).toFormat('YYYY/MM/DD HH24:MI:SS');
}
