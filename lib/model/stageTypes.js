var stageTypes  = {
    issue  : {name: 'issue',    displayName: 'Issue',   assigned: false,    visible: true},
    backlog: {name: 'backlog',  displayName: 'Backlog', assigned: false,    visible: true},
    todo   : {name: 'todo',     displayName: 'TODO',    assigned: true,     visible: true},
    doing  : {name: 'doing',    displayName: 'Doing',   assigned: true,     visible: true},
    review : {name: 'review',   displayName: 'Review',  assigned: true,     visible: true},
    done   : {name: 'done',     displayName: 'Done',    assigned: false,    visible: true},
    archive: {name: 'archive',  displayName: 'Archive', assigned: false,    visible: false}
};


module.exports = stageTypes;