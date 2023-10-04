'use strict';

(function (angular, buildfire) {
    //created peoplePluginContent module
    angular
        .module('peoplePluginContent', [
            'peopleEnums',
            'peopleFiltersContent',
            'peopleServices',
            'ngAnimate',
            'ngRoute',
            'ui.bootstrap',
            'ui.sortable',
            'infinite-scroll',
            "ui.tinymce",
            "bngCsv"])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        .constant('TAG_NAMES', {
            PEOPLE_INFO: 'peopleInfo',
            PEOPLE: 'people',
            DB_PROVIDER : 'dbProvider'
        })
        .constant('ERROR_CODE', {
            NOT_FOUND: 'NOTFOUND'
        })
        .constant('STATUS_CODE', {
            INSERTED: 'inserted',
            UPDATED: 'updated'
        })
        .constant('SORT', {
            MANUALLY: 'Manually',
            OLDEST_TO_NEWEST: 'Oldest to Newest',
            NEWEST_TO_OLDEST: 'Newest to Oldest',
            FIRST_NAME_A_TO_Z: 'First Name A-Z',
            FIRST_NAME_Z_TO_A: 'First Name Z-A',
            LAST_NAME_A_TO_Z: 'Last Name A-Z',
            LAST_NAME_Z_TO_A: 'Last Name Z-A',
            _limit: 10,
            _maxLimit: 19,
            _skip: 0
        }).run(function(){
            aiStateSeederManager.init();
        })
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'ContentHome',
                    controller: 'ContentHomeCtrl',
                    resolve: {
                        PeopleInfo: ['$q', 'DB', 'COLLECTIONS', 'Location', function ($q, DB, COLLECTIONS, Location) {
                            var deferred = $q.defer();
                            var PeopleInfo = new DB(COLLECTIONS.peopleInfo);
                            /*    var _bootstrap = function () {
                             PeopleInfo.save({
                             content: {
                             images: [],
                             description: '',
                             sortBy: "Manually",
                             rankOfLastItem: 0
                             },
                             design: {
                             itemLayout: "item-layout-1",
                             listLayout: "list-layout-1",
                             backgroundImage: ''
                             }
                             }).then(function success() {
                             Location.goToHome();
                             }, function fail() {
                             _bootstrap();
                             })
                             };*/
                            PeopleInfo.get().then(function success(result) {
                                    if (result && result.data && result.data.content && result.data.design) {
                                        deferred.resolve(result);
                                    }
                                    else {
                                        //error in bootstrapping
                                        //_bootstrap(); //bootstrap again  _bootstrap();
                                        deferred.resolve({
                                            data: {
                                                content: {
                                                    images: [],
                                                    description: '',
                                                    sortBy: "Manually",
                                                    rankOfLastItem: 0
                                                },
                                                design: {
                                                    itemLayout: "item-layout-1",
                                                    listLayout: "list-layout-1",
                                                    backgroundImage: ''
                                                }
                                            }
                                        });
                                    }
                                },
                                function fail() {
                                    Location.goToHome();
                                }
                            );
                            return deferred.promise;
                        }]
                    }
                })
                .when('/people', {
                    templateUrl: 'templates/people.html',
                    controllerAs: 'ContentPeople',
                    controller: 'ContentPeopleCtrl'
                })
                .when('/people/:itemId', {
                    templateUrl: 'templates/people.html',
                    controllerAs: 'ContentPeople',
                    controller: 'ContentPeopleCtrl'
                })
                .otherwise('/');
        }])
        .factory('Buildfire', [function () {
            return buildfire;
        }])
        .directive('fileReader', [function () {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.context.onchange = function (event) {
                        var files = event && event.target && event.target.files; //FileList object
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            var picReader = new FileReader();
                            picReader.addEventListener("load", function (event) {
                                var textFile = event.target;
                                scope.ImportCSVPopup[attrs.fileReader] = textFile.result;
                            });
                            //Read the text file
                            picReader.readAsText(file);
                        }

                    }

                }
            };
        }])
        .factory('Location', ['$timeout', '$location', function ($timeout, $location) {
            var _location = window.location;
            return {
                goTo: function (path) {
                    $timeout(() => {
                        $location.path(path);
                    });
                },
                goToHome: function () {
                    $timeout(() => {
                        $location.path('/');
                    });
                },
            };
        }])
        .factory('RankOfLastItem', [function () {
            var _rankOfLastItem;
            return {
                getRank: function () {
                    return _rankOfLastItem;
                },
                setRank: function (value) {
                    _rankOfLastItem = value;
                }
            };
        }])
        .filter('getImageUrl', function () {
            return function (url, width, height, type) {
                if (type == 'resize')
                    return buildfire.imageLib.resizeImage(url, {
                        width: width,
                        height: height
                    });
                else
                    return buildfire.imageLib.cropImage(url, {
                        width: width,
                        height: height
                    });
            }
        })
        .run(['Location', 'Buildfire', function (Location, Buildfire) {
// Handler to receive message from widget
            buildfire.messaging.onReceivedMessage = function (msg) {
                console.log(msg.type, window.location.href, msg.id);
                switch (msg.type) {
                    case 'OpenItem':
                        Location.goTo("people/" + msg.id);
                        break;
                    default:
                        Buildfire.history.pop();
                        Location.goToHome();
                }
            };
            Buildfire.history.onPop(function (data, err) {
                if (data && data.label != 'Person')
                    Location.goToHome();
                console.log('Buildfire.history.onPop called--------------------------------------------', data, err);
            });
        }]);

    angular.element(function() {
        var defaultProvider = 'datastore';
        buildfire.datastore.get('dbProvider', function(err, result) {
          try {
              if (err) throw err;
              window.DB_PROVIDER = result.data.provider
                ? result.data.provider
                : defaultProvider;

              window.ENABLE_UNIQUE_EMAIL = result.data.enableUniqueEmail;

              angular.bootstrap(document, ['peoplePluginContent']);
            } catch (err) {
              window.DB_PROVIDER = defaultProvider;
              window.ENABLE_UNIQUE_EMAIL = false;
              angular.bootstrap(document, ['peoplePluginContent']);
            }
        });
    })

})(window.angular, window.buildfire);
