var stageTypes  = {
    issue:   {name: 'issue',   displayName: 'Issue',   assigned: false},
    backlog: {name: 'backlog', displayName: 'Backlog', assigned: false},
    todo:    {name: 'todo',    displayName: 'TODO',    assigned: true},
    doing:   {name: 'doing',   displayName: 'Doing',   assigned: true},
    review:  {name: 'review',  displayName: 'Review',  assigned: true},
    done:    {name: 'done',    displayName: 'Done',    assigned: false}
};


module.exports = stageTypes;