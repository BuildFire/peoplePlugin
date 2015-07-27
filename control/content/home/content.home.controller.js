'use strict';

(function (angular, window) {
    angular
        .module('peoplePluginContent')
        .controller('ContentHomeCtrl', ['$scope', 'Buildfire', 'TAG_NAMES', 'ERROR_CODE', function ($scope, Buildfire, TAG_NAMES, ERROR_CODE) {
            var _self = this;
            _self.items = null;
            _self.data = null;
            $scope.sortableOptions = {
            };

            _self.sortingOptions = [
                'Manually',
                'Oldest to Newest',
                'Newest to Oldest',
                'First Name A-Z',
                'First Name Z-A',
                'Last Name A-Z',
                'Last Name Z-A'
            ];
            var tmrDelayForPeopleInfo = null;
            var tmrDelayForPeoples = null;
            var _data = {
                content: {
                    images: [{
                        title: 'default',
                        imageUrl: 'http://www.placehold.it/80x50',
                        deepLinkUrl: ''
                    }],
                    description: '',
                    sortBy: ''
                },
                design: {
                    listLayout: '',
                    itemLayout: '',
                    backgroundImage: ''
                }
            };

            var saveData = function (newObj, tag) {
                if (newObj == undefined)return;
                Buildfire.datastore.save(newObj, tag, function (err, result) {
                    if (err || !result)
                        console.error('------------error saveData-------', err);
                    else
                        console.log('------------data saved-------', result);
                });
            };

            _self.openDeepLinkDialog = function () {
                window.openDialog('deepLink.html', null, 'sm', null);
            };
            _self.openRemoveDialog = function () {
                window.openDialog('remove.html', null, 'sm', null);
            };
            _self.openImportCSVDialog = function () {
                window.openDialog('importCSV.html', null, 'sm', null);
            };
            _self.removeListItem = function (_index) {
                _self.items.splice(_index, 1);
            };
            _self.searchListItem = function (value) {

            };
            _self.sortPeoplesBy = function (value) {
                _self.data.content.sortBy = value;
            };
            _self.removeCarouselImage=function($index){
                _self.data.content.images.splice($index,1);
            };

            Buildfire.datastore.get(TAG_NAMES.PEOPLE_INFO, function (err, result) {
                if (err && err.code !== ERROR_CODE.NOT_FOUND) {
                    console.error('-----------err-------------', err);
                }
                else if (err && err.code === ERROR_CODE.NOT_FOUND) {
                    saveData(JSON.parse(angular.toJson(_data)), TAG_NAMES.PEOPLE_INFO);
                }
                else if (result) {
                    _self.data = result.data;
                    if (!_self.data.content.sortBy) {
                        _self.data.content.sortBy = _self.sortingOptions[0];
                    }
                    $scope.$digest();
                    if (tmrDelayForPeopleInfo)clearTimeout(tmrDelayForPeopleInfo);
                }
            });

            Buildfire.datastore.get(TAG_NAMES.PEOPLES, function (err, result) {
                if (err && err.code !== ERROR_CODE.NOT_FOUND) {
                    console.error('-----------err in getting list-------------', err);
                }
                else if (result) {
                    _self.items = result.data;
                    $scope.$digest();
                    if (tmrDelayForPeoples)clearTimeout(tmrDelayForPeoples);
                }
            });
            Buildfire.datastore.onUpdate(function (result) {
                if (result && result.tag === TAG_NAMES.PEOPLE_INFO) {
                    console.log('-----------Data Updated Successfully-------------', result.obj);
                    if (tmrDelay)clearTimeout(tmrDelay);
                } else if (result && result.tag === TAG_NAMES.PEOPLES) {
                    console.log('-----------Data Updated Successfully-------------', result.obj);
                    if (tmrDelay)clearTimeout(tmrDelay);
                }
            });
            
            Buildfire.datastore.onUpdate(function (event) {
                if (event && event.tag === TAG_NAMES.PEOPLE_INFO) {
                    _self.data = event.obj;
                    if (tmrDelayForPeopleInfo)clearTimeout(tmrDelayForPeopleInfo);
                } else if (event && event.tag === TAG_NAMES.PEOPLES) {
                    _self.items = event.obj;
                    if (tmrDelayForPeoples)clearTimeout(tmrDelayForPeoples);
                }
            });


            var saveDataWithDelay = function (newObj) {
                if (newObj) {
                    if (tmrDelayForPeopleInfo)clearTimeout(tmrDelayForPeopleInfo);
                    tmrDelayForPeopleInfo = setTimeout(function () {
                        saveData(JSON.parse(angular.toJson(newObj)), TAG_NAMES.PEOPLE_INFO);
                    }, 500);
                }
            };

            var saveItemsWithDelay = function (newItems) {
                if (newItems) {
                    if (tmrDelayForPeoples)clearTimeout(tmrDelayForPeoples);
                    tmrDelayForPeoples = setTimeout(function () {
                        saveData(JSON.parse(angular.toJson(newItems)), TAG_NAMES.PEOPLES);
                    }, 500);
                }
            };

            $scope.$watch(function () {
                return _self.data;
            }, saveDataWithDelay, true);

            $scope.$watch(function () {
                return _self.items;
            }, saveItemsWithDelay, true);

        }])
})(window.angular, window);
