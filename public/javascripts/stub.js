(function (global, $, _, ko, util) {
    'use strict';

    var ns = util.namespace('kpp.stub');

    ns.issues = [
        { id: '1', name: 'yaDsutSW', assigned: '1' },
        { id: '2', name: 'vgW8w9Tk', assigned: '1' },
        { id: '3', name: 'QairGPAp', assigned: '1' },
        { id: '4', name: '44r24AR4', assigned: '1' },
        { id: '5', name: 'k4YJTxsi', assigned: '1' },
        { id: '6', name: 'EMAtR5cT', assigned: '1' },
        { id: '7', name: 'dEpJ5H6H', assigned: '2' },
        { id: '8', name: 'FNCD6h5B', assigned: '2' },
        { id: '9', name: 'ywaAb6wp', assigned: '2' },
        { id: '10', name: 'GhAJSjiM', assigned: '2' },
        { id: '11', name: 'B2uc7Nag', assigned: '2' },
        { id: '12', name: 'w3L4E2iu', assigned: '2' },
        { id: '13', name: 'Qg85Zc9T', assigned: '2' },
        { id: '14', name: 'Jy5iqBMP', assigned: '2' },
        { id: '15', name: 'eK4csxNT', assigned: '2' },
        { id: '16', name: 'Gt9aCKBF', assigned: null },
        { id: '17', name: 'Tq9mAd7w', assigned: null },
        { id: '18', name: 'gB2jnPN5', assigned: null },
        { id: '19', name: 'c2LrACGY', assigned: null },
        { id: '20', name: 'm3Kv7gYH', assigned: null }
    ];

    ns.users = [
        {
            id: '1',
            name: 'wQ8MZTzR',
            todo: ['6'],
            doing: ['4'],
            review: ['3'],
            done: ['1', '2']
        },
        {
            id: '2',
            name: 'Az4bUwum',
            todo: ['13', '14', '15'],
            doing: ['11', '12'],
            review: ['10'],
            done: ['7', '8', '9']
        }
    ];

}(window, jQuery, _, ko, window.nakazawa.util));