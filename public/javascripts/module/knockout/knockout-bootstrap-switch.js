// ref: https://jsfiddle.net/meno/MBLP9/

(function ($, ko) {
    ko.bindingHandlers.bootstrapSwitchOn = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var $elem = $(element);
            $elem.bootstrapSwitch();
            $elem.bootstrapSwitch('state', ko.utils.unwrapObservable(valueAccessor()));
            $elem.on('switchChange.bootstrapSwitch', function (e, state){
                valueAccessor()(state);
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var $elem = $(element);
            var vStatus = $elem.bootstrapSwitch('state');
            var vmStatus = ko.utils.unwrapObservable(valueAccessor());
            if (vStatus !== vmStatus) {
                $elem.bootstrapSwitch('state', vmStatus);
            }
        }
    };
}(jQuery, ko));