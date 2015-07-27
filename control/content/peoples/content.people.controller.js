'use strict';
(function (angular) {
    angular
        .module('peoplePluginContent')
        .controller('ContentPeoplesCtrl', ['$scope', '$location', 'Buildfire', 'TAG_NAMES', 'ERROR_CODE', function ($scope, $location, Buildfire, TAG_NAMES, ERROR_CODE) {
            var _self = this;
            _self.items = [];

            _self.item = {
                topImage: '',
                iconImage: '',
                fName: '',
                lName: '',
                position: '',
                deepLinkUrl: '',
                description: '',
                links: []
            };

            var saveData = function (newObj, tag) {
                if (newObj == undefined)return;
                Buildfire.datastore.save(newObj, tag, function (err, result) {
                    if (err || !result)
                        console.log('------------error saveData-------', err);
                    else
                        console.log('------------data saved-------', result);
                });
            };

            _self.addNewItem = function (path) {
                _self.items.push(_self.item);
                $location.path(path)
            };

            Buildfire.datastore.get(TAG_NAMES.PEOPLES, function (err, result) {
                if (err && err.code !== ERROR_CODE.NOT_FOUND) {
                    console.error('-----------err-------------', err);
                }
                else if (err && err.code === ERROR_CODE.NOT_FOUND) {
                    saveData(JSON.parse(angular.toJson(_self.items)), TAG_NAMES.PEOPLES);
                }
                else if (result) {
                    _self.items = result.data;
                    $scope.$digest();
                    if (tmrDelayForPeoples)clearTimeout(tmrDelayForPeoples);
                }
            });

            Buildfire.datastore.onUpdate(function (event) {
                if (event && event.tag === TAG_NAMES.PEOPLES) {
                    _self.items = event.obj;
                    if (tmrDelayForPeoples)clearTimeout(tmrDelayForPeoples);
                }
                else if (event && event.tag === TAG_NAMES.PEOPLE_INFO) {
                    console.error('-----------PeopleInfo Data Updated Successfully-------------', event.obj);
                }
            });


            var tmrDelayForPeoples = null;
            var saveItemsWithDelay = function (newObj) {
                if (tmrDelayForPeoples)clearTimeout(tmrDelayForPeoples);
                tmrDelayForPeoples = setTimeout(function () {
                    saveData(JSON.parse(angular.toJson(newObj)), TAG_NAMES.PEOPLES);
                }, 500);
            };

            $scope.$watch(function () {
                return _self.items;
            }, saveItemsWithDelay, true);
        }]);
})(window.angular);
