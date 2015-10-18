var stageTypes  = {
    issue  : {name: 'issue',    displayName: 'Issue',   assigned: false,    visible: true,  state: 'open'},
    backlog: {name: 'backlog',  displayName: 'Backlog', assigned: false,    visible: true,  state: 'open'},
    todo   : {name: 'todo',     displayName: 'TODO',    assigned: true,     visible: true,  state: 'open'},
    doing  : {name: 'doing',    displayName: 'Doing',   assigned: true,     visible: true,  state: 'open'},
    review : {name: 'review',   displayName: 'Review',  assigned: true,     visible: true,  state: 'open'},
    done   : {name: 'done',     displayName: 'Done',    assigned: false,    visible: true,  state: 'closed'},
    archive: {name: 'archive',  displayName: 'Archive', assigned: false,    visible: false, state: 'closed'}
};


module.exports = stageTypes;