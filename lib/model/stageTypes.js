var stageTypes  = {
    issue:   {name: 'issue', assigned: false},
    backlog: {name: 'backlog', assigned: false},
    todo:    {name: 'todo', assigned: true},
    doing:   {name: 'doing', assigned: true},
    review:  {name: 'review', assigned: true},
    done:    {name: 'done', assigned: false}
};


module.exports = stageTypes;