'use strict';

(function (angular, window) {
    angular
        .module('peoplePluginWidget')
        .controller('WidgetHomeCtrl', ['$scope', 'Buildfire', 'TAG_NAMES', 'COLLECTIONS', 'ERROR_CODE', "Location", '$sce', '$rootScope', 'DB',
            function ($scope, Buildfire, TAG_NAMES, COLLECTIONS, ERROR_CODE, Location, $sce, $rootScope, DB) {
                console.log('[DATASTORE] Currently using', window.DB_PROVIDER);
                function debounce(func, wait, immediate) {
                  var timeout;
                  return function() {
                    var context = this, args = arguments;
                    var later = function() {
                      timeout = null;
                      if (!immediate) func.apply(context, args);
                    };
                    var callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) func.apply(context, args);
                  };
                }

                var minSearchLength = 1;

                var debounceLoadMore = debounce(function(){
                    WidgetHome.loadMore();
                }, 500);



                /*unqiueList*/
                (function () {
                    var unqiueListEmail = {};
                    var unqiueListId = {};

                    $scope.validToAddItem = function (obj) {
                        if (!WidgetHome.items || WidgetHome.items.length < 1) {
                            return true;
                        }
                        if (window.ENABLE_UNIQUE_EMAIL && obj) {
                            var key = obj.data && obj.data.email ? obj.data.email.toLowerCase() : null;
                            if (unqiueListEmail[key] || (typeof(obj.data.deleted) != "undefined" && obj.data.deleted.toString() == "true")) {
                                return false;
                            }
                        }
                        return true;
                    };
                    $scope.addToItems = function (obj) {
                        if (window.ENABLE_UNIQUE_EMAIL && obj) {
                            var keyEmail = obj.data && obj.data.email ? obj.data.email.toLowerCase() : null;
                            var keyId = obj.id? obj.id : null;
                            if (unqiueListId[keyId] || unqiueListEmail[keyEmail] || (typeof(obj.data.deleted) != "undefined" && obj.data.deleted.toString() == "true")) {
                                return false;
                            }
                            if (!WidgetHome.items) {
                                WidgetHome.items = [];
                            }
                            if (keyEmail)
                                unqiueListEmail[keyEmail] = obj.id;
                            if (keyId)
                                unqiueListId[keyId] = obj.id;
                            WidgetHome.items.push(obj);
                        }
                        else{
                            if (!WidgetHome.items) {
                                WidgetHome.items = [];
                            }
                            var keyId = obj.id? obj.id : null;
                            if (unqiueListId[keyId]) {
                                return false;
                            }
                            if (keyId)
                                unqiueListId[keyId] = obj.id;
                            WidgetHome.items.push(obj);
                        }
                        return true;
                    };
                    $scope.addItems = function (items) {
                        if (!WidgetHome.items || WidgetHome.items.length < 1) {
                            unqiueListEmail = {};
                            unqiueListId = {};
                        }
                        if (items) {
                            for (var i = 0; i < items.length; i++) {
                                $scope.addToItems(items[i]);
                            }
                        }
                    };
                })();

                $scope.searchInput = "";
                $scope.clear = function() {
                    $scope.searchInput = "";
                    $scope.onSearchChange();
                }

                var executeSearch = debounce(function() {
                    WidgetHome.loadMore();
                }, 500);

                // listen to input changes
                $scope.onSearchChange = function() {
                    var isEmptySearch = ($scope.searchInput.length === 0);

                    // Don't do anything if the search is less than minSearchLength characters and isn't empty
                    if ($scope.searchInput.length < minSearchLength && !isEmptySearch) {
                        return;
                    }

                    //if the search is an empty search, clear out existing filtered results
                    if(isEmptySearch) {
                        WidgetHome.items = [];
                    }

                    searchOptions.skip = 0;
                    executeSearch();
                };

                $scope.onSearchSubmit = function(e) {
                    //e.preventDefault();
                    console.log(e);
                };

                var MANUALLY = 'Manually',
                    OLDEST_TO_NEWEST = 'Oldest to Newest',
                    NEWEST_TO_OLDEST = 'Newest to Oldest',
                    FIRST_NAME_A_TO_Z = 'First Name A-Z',
                    FIRST_NAME_Z_TO_A = 'First Name Z-A',
                    LAST_NAME_A_TO_Z = 'Last Name A-Z',
                    LAST_NAME_Z_TO_A = 'Last Name Z-A',
                    _limit = 15,
                    searchOptions = {
                        filter: {"$json.fName": {"$regex": '/*'}},
                        skip: 0,
                        sort : {"rank": 1},
                        limit: _limit + 1 // the plus one is to check if there are any more
                    },
                    DEFAULT_LIST_LAYOUT = 'list-layout-1',
                    DEFAULT_ITEM_LAYOUT = 'item-layout-1';
                var PeopleInfo = new DB(TAG_NAMES.PEOPLE_INFO);
                var WidgetHome = this;
                WidgetHome.data = {};
                WidgetHome.busy = false;
                WidgetHome.sortingOptions = [
                    MANUALLY,
                    OLDEST_TO_NEWEST,
                    NEWEST_TO_OLDEST,
                    FIRST_NAME_A_TO_Z,
                    FIRST_NAME_Z_TO_A,
                    LAST_NAME_A_TO_Z,
                    LAST_NAME_Z_TO_A
                ];
                WidgetHome.defaults = {
                    DEFAULT_LIST_LAYOUT: 'list-layout-1',
                    DEFAULT_ITEM_LAYOUT: 'item-layout-1',
                    DEFAULT_SORT_OPTION: MANUALLY
                };
                //create new instance of buildfire carousel viewer
                var view = null;
                var currentItemLayout,
                    currentListLayout, currentSortOrder, currentBackgroundImage;
                WidgetHome.data = {};

                WidgetHome.shouldShowCarousel = function() {
                    var hasImages = (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.images)
                        ? WidgetHome.data.content.images.length > 0
                        : false;
                    var isSearching = $scope.searchInput.length >= minSearchLength;
                    return hasImages && !isSearching;
                }

                WidgetHome.shouldShowDescription = function() {
                    var isSearching = $scope.searchInput.length >= minSearchLength;
                    var hasDescription = WidgetHome.data && WidgetHome.data.content
                        && WidgetHome.data.content.description
                        && WidgetHome.data.content.description.length;
                    return !isSearching && hasDescription;
                }

                $rootScope.showHome = true;
                var getSortOption = function (value, searchOptions) {
                    switch (value) {
                        case MANUALLY:
                            searchOptions.sort = {"rank": 1};
                            break;
                        case OLDEST_TO_NEWEST:
                            searchOptions.sort = {"dateCreated": 1};
                            break;
                        case NEWEST_TO_OLDEST:
                            searchOptions.sort = {"dateCreated": -1};
                            break;
                        case FIRST_NAME_A_TO_Z:
                            searchOptions.sort = {"fName": 1};
                            break;
                        case FIRST_NAME_Z_TO_A:
                            searchOptions.sort = {"fName": -1};
                            break;
                        case LAST_NAME_A_TO_Z:
                            searchOptions.sort = {"lName": 1};
                            break;
                        case LAST_NAME_Z_TO_A:
                            searchOptions.sort = {"lName": -1};
                            break;
                        default :
                            searchOptions.sort = {"rank": 1};
                            break;
                    }
                    return searchOptions;
                };

                /*declare the device width heights*/
                $rootScope.deviceHeight = window.innerHeight;
                $rootScope.deviceWidth = window.innerWidth || 320;
                $rootScope.backgroundImage = "";

                /*initialize the device width heights*/
                var initDeviceSize = function (callback) {
                    $rootScope.deviceHeight = window.innerHeight;
                    $rootScope.deviceWidth = window.innerWidth;
                    if (callback) {
                        if (WidgetHome.deviceWidth == 0 || WidgetHome.deviceHeight == 0) {
                            setTimeout(function () {
                                initDeviceSize(callback);
                            }, 500);
                        } else {
                            callback();
                            if (!$scope.$$phase && !$scope.$root.$$phase) {
                                $scope.$apply();
                            }
                        }
                    }
                };

                var initCarousel = function(carouselImages) {
                    if (!view) {
                        view = new Buildfire.components.carousel.view("#carousel", []);
                    }

                    if(carouselImages){
                        view.loadItems(carouselImages);
                    }
                    else {
                        view.loadItems([]);
                    }
                };

                /* Get People details*/
                WidgetHome.getPeopleDetails = function (peopleId) {
                    Location.goTo("#/people/" + peopleId);
                };
                /*crop image on the basis of width heights*/
                WidgetHome.cropImage = function (url, settings) {
                    var options = {};
                    if (!url) {
                        return "";
                    }
                    else {
                        if (settings.height) {
                            options.height = settings.height;
                        }
                        if (settings.width) {
                            options.width = settings.width;
                        }
                        return Buildfire.imageLib.cropImage(url, options);
                    }
                };

                var init = function () {
                    var success = function (result) {
                            WidgetHome.data = result.data;
                            WidgetHome.data.design = WidgetHome.data.design || {};
                            if (WidgetHome.data.design) {
                                WidgetHome.data.design.itemLayout = WidgetHome.data.design.itemLayout ? WidgetHome.data.design.itemLayout : WidgetHome.defaults.DEFAULT_ITEM_LAYOUT;
                                WidgetHome.data.design.listLayout = WidgetHome.data.design.listLayout ? WidgetHome.data.design.listLayout : WidgetHome.defaults.DEFAULT_LIST_LAYOUT;
                                currentBackgroundImage = WidgetHome.data.design.backgroundImage;
                                currentItemLayout = WidgetHome.data.design.itemLayout;
                                currentListLayout = WidgetHome.data.design.listLayout;
                            }
                            if (WidgetHome.data.content) {
                                currentSortOrder = WidgetHome.data.content.sortBy;
                            }
                            $rootScope.backgroundImage = WidgetHome.data.design.backgroundImage ? WidgetHome.data.design.backgroundImage : "";

                        }
                        , error = function (err) {
                            if (err) {
                                console.error('Error while getting data', err);
                            }
                        };
                    PeopleInfo.get(TAG_NAMES.PEOPLE_INFO).then(success, error);
                };

                init();
                $scope.isDefined = function (item) {
                    return item.imageUrl !== undefined && item.imageUrl !== '';
                };
                WidgetHome.safeHtml = function (html) {
                    if (html) {
                        var $html = $('<div />', {html: html});
                        $html.find('iframe').each(function (index, element) {
                            var src = element.src;
                            console.log('element is: ', src, src.indexOf('http'));
                            src = src && src.indexOf('file://') != -1 ? src.replace('file://', 'http://') : src;
                            element.src = src && src.indexOf('http') != -1 ? src : 'http:' + src;
                        });
                        return $sce.trustAsHtml($html.html());
                    }
                };
                WidgetHome.showDescription = function (description) {
                  var _retVal = false;
                  description = description && description.trim();
                  if(description && (description !== '<p>&nbsp;<br></p>') && (description !== '<p><br data-mce-bogus="1"></p>')) {
                    _retVal = true;
                  }
                  return _retVal;
                };
                var onUpdateCallback = function (event) {
                    console.log('+++ ON UPDATE CALLBACK', window.DB_PROVIDER, event.tag, event);
                    $scope.imagesUpdated = false;
                    $scope.$digest();

                    if (event && event.tag) {
                        if (event.data && WidgetHome.data.design && event.data.design) {
                            WidgetHome.data.design = event.data.design;
                        }
                        if (!WidgetHome.data.content) {
                            WidgetHome.data.content = {
                                sortBy: WidgetHome.defaults.DEFAULT_SORT_OPTION
                            }
                        }
                        if (!WidgetHome.data.design || !WidgetHome.data.design.itemLayout || !WidgetHome.data.design.listLayout) {
                            WidgetHome.data.design = {
                                itemLayout: WidgetHome.defaults.DEFAULT_ITEM_LAYOUT,
                                listLayout: WidgetHome.defaults.DEFAULT_LIST_LAYOUT
                            };
                            currentItemLayout = WidgetHome.data.design.itemLayout;
                            currentListLayout = WidgetHome.data.design.listLayout;
                        }
                        switch (event.tag) {
                            case TAG_NAMES.DB_PROVIDER:
                                    location.reload();
                                break;
                            case TAG_NAMES.PEOPLE:
                                var skip = searchOptions.skip || 0;
                                WidgetHome.busy = false;
                                WidgetHome.items = [];
                                if (searchOptions.skip && searchOptions.skip >= _limit) {
                                    searchOptions.limit = _limit + 1;
                                    var times = Math.floor(searchOptions.skip / _limit);
                                    searchOptions.skip = 0;
                                    WidgetHome.loadMore(true, Math.min(times - 1, 0));
                                } else {
                                    searchOptions.limit = _limit + 1;
                                    searchOptions.skip = 0;

                                    debounceLoadMore();
                                }

                                break;
                            case TAG_NAMES.PEOPLE_INFO:
                                if (event.data) {
                                    if (event.data.design && event.data.design.itemLayout && currentItemLayout != event.data.design.itemLayout) {
                                        if (WidgetHome.items && WidgetHome.items.length) {
                                            var id = WidgetHome.items[0].id;
                                            $rootScope.showHome = true;
                                            Location.goTo("#/people/" + id);
                                        }
                                    }
                                    else if (event.data.design && event.data.design.listLayout && currentListLayout != event.data.design.listLayout) {
                                        currentListLayout = event.data.design.listLayout;
                                        WidgetHome.data.design.listLayout = event.data.design.listLayout;
                                    }
                                    if (!WidgetHome.data.design)
                                        WidgetHome.data.design = {};
                                    currentItemLayout = WidgetHome.data.design.itemLayout || DEFAULT_ITEM_LAYOUT;

                                    if (event.data.content) {
                                        if (!WidgetHome.data)
                                            WidgetHome.data = {};
                                        WidgetHome.data.content = event.data.content;
                                        $scope.imagesUpdated = true;
                                    } else {
                                        $scope.imagesUpdated = false;
                                    }
                                    if (!event.data.design.backgroundImage) {
                                        $rootScope.backgroundImage = ""
                                    } else {
                                        $rootScope.backgroundImage = event.data.design.backgroundImage;
                                    }

                                    if (currentListLayout != WidgetHome.data.design.listLayout && view && WidgetHome.data.content.images) {
                                        view._destroySlider();
                                        view = null;
                                    }
                                    else {
                                        var images = (WidgetHome.data.content && WidgetHome.data.content.images)
                                            ? WidgetHome.data.content.images
                                            : null;

                                        initCarousel(images);
                                    }
                                    if (event && event.data && event.data.content && event.data.content.sortBy && currentSortOrder != event.data.content.sortBy) {                                        
                                        WidgetHome.data.content.sortBy = event.data.content.sortBy;
                                        WidgetHome.items = [];
                                        searchOptions.skip = 0;
                                        WidgetHome.busy = false;
                                        WidgetHome.loadMore();
                                    }
                                }
                                break;
                        }
                        $scope.$digest();
                        $rootScope.$apply();
                    }
                };

                var debounceUpdateCallback = debounce(onUpdateCallback, 500);

                Buildfire.datastore.onUpdate(debounceUpdateCallback);
                Buildfire.publicData.onUpdate(debounceUpdateCallback);

                WidgetHome.noMore = false;
                WidgetHome.loadMore = function (multi, times, adjustment) {
                    window.buildfire.spinner.show();
                    console.log("loadMore");
                    if (WidgetHome.busy) {
                        return;
                    }
                    WidgetHome.busy = true;

                    if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.sortBy) {
                        searchOptions = getSortOption(WidgetHome.data.content.sortBy, searchOptions);
                    }

                    if ($scope.searchInput) {
                        searchOptions.filter = {
                            $or: [
                                { "$json.fName": { $regex: $scope.searchInput, $options: 'i' } },
                                { "$json.lName": { $regex: $scope.searchInput, $options: 'i' } },
                                { "$json.position": { $regex: $scope.searchInput, $options: 'i' } }
                            ]
                        };
                        if (window.ENABLE_UNIQUE_EMAIL) {
                            searchOptions.filter['$and'] = [{
                                $or: [
                                    {'$json.deleted': {$exists: false}},
                                    {'$json.deleted': {$ne: 'true'}}]
                            }];
                        }
                    }else{
                        if (window.ENABLE_UNIQUE_EMAIL) {
                            searchOptions.filter = {
                                $or: [
                                    {'$json.deleted': {$exists: false}},
                                    {'$json.deleted': {$ne: 'true'}}]
                            };
                        }
                        else{
                            searchOptions.filter = {
                                $or: [
                                    {'$json.deleted': {$exists: false}},
                                    {'$json.deleted': {$ne: 'true'}}]
                            };
                        }
                    }

                    Buildfire[window.DB_PROVIDER].search(searchOptions, TAG_NAMES.PEOPLE, function (err, result) {
                        console.log('-----------WidgetHome.loadMore-------------');                        
                        if (err) {
                            window.buildfire.spinner.hide();
                            return console.error('-----------err in getting list-------------', err);
                        }
                        if (result.length <= _limit) {// to indicate there are more
                            WidgetHome.noMore = true;
                            window.buildfire.spinner.hide();
                        } else {
                            result.pop();
                            searchOptions.skip = searchOptions.skip + _limit;
                            WidgetHome.noMore = false;
                        }


                        if ($scope.searchInput && searchOptions.skip <= 15) {
                            if (!adjustment)
                                WidgetHome.items = [];
                            //WidgetHome.items = result;
                        } else {
                            //WidgetHome.items = WidgetHome.items ? WidgetHome.items.concat(result) : result;
                        }
                        $scope.addItems(result);

                        WidgetHome.busy = false;
                        if (multi && !WidgetHome.noMore && times) {
                            times = times - 1;
                            WidgetHome.loadMore(multi, times);
                        }
                        window.buildfire.spinner.hide();
                        $scope.$digest();
                    });
                };
                /**
                 * WidgetHome.resizeImage method to resize
                 * @param url
                 * @param width
                 * @param height
                 * @returns {null}
                 */
                WidgetHome.resizeImage = function (url, width, height) {
                    return Buildfire.imageLib.resizeImage(url, {
                        width: width,
                        height: height
                    });
                };
                $rootScope.$on('Item_Updated',function(e,data){
                    console.log('Item_Updated got--------------------------------',data);
                    if(WidgetHome.items && data && data.id){
                        WidgetHome.items.some(function(item){
                            if(item.id==data.id){
                                item.data=data.data;
                                return true;
                            }
                        });
                    }
                });
                $rootScope.$on("ROUTE_CHANGED", function (e, listLayout, itemLayout, background, data) {
                    WidgetHome.data = data;
                    if (!WidgetHome.data.design)
                        WidgetHome.data.design = {};
                    if (!WidgetHome.data.content)
                        WidgetHome.data.content = {};

                    if(background){
                        $rootScope.backgroundImage = background;
                    }
                    Buildfire[window.DB_PROVIDER].onRefresh(function () {
                        var success = function (result) {
                              WidgetHome.data = result.data;
                              WidgetHome.data.design = WidgetHome.data.design || {};
                              if (WidgetHome.data.design) {
                                  currentBackgroundImage = WidgetHome.data.design.backgroundImage;
                                  currentItemLayout = WidgetHome.data.design.itemLayout;
                                  currentListLayout = WidgetHome.data.design.listLayout;
                              }
                              if (WidgetHome.data.content) {
                                  currentSortOrder = WidgetHome.data.content.sortBy;
                              }

                            initCarousel(WidgetHome.data.content.images);

                            $rootScope.backgroundImage = WidgetHome.data.design.backgroundImage ? WidgetHome.data.design.backgroundImage : "";
                          }
                          , error = function (err) {
                              if (err) {
                                  console.error('Error while getting data', err);
                              }
                          };

                        PeopleInfo.get(TAG_NAMES.PEOPLE_INFO).then(success, error);
                        WidgetHome.items = [];
                        searchOptions.skip = 0;
                        WidgetHome.busy = false;
                        WidgetHome.loadMore();
                        $scope.$digest();
                    });

                    Buildfire.datastore.onUpdate(onUpdateCallback);
                    Buildfire.publicData.onUpdate(onUpdateCallback);
                });

                $rootScope.$on("Carousel:LOADED", function () {
                    view = null;
                    var images = (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.images)
                        ? WidgetHome.data.content.images
                        : [];

                    initCarousel(images);
                });

                Buildfire[window.DB_PROVIDER].onRefresh(function () {
                    var success = function (result) {
                          WidgetHome.data = result.data;
                          WidgetHome.data.design = WidgetHome.data.design || {};
                          if (WidgetHome.data.design) {
                              currentBackgroundImage = WidgetHome.data.design.backgroundImage;
                              currentItemLayout = WidgetHome.data.design.itemLayout;
                              currentListLayout = WidgetHome.data.design.listLayout;
                          }
                          if (WidgetHome.data.content) {
                              currentSortOrder = WidgetHome.data.content.sortBy;
                          }

                          initCarousel(WidgetHome.data.content.images);

                          $rootScope.backgroundImage = WidgetHome.data.design.backgroundImage ? WidgetHome.data.design.backgroundImage : "";
                      }
                      , error = function (err) {
                          if (err) {
                              console.error('Error while getting data', err);
                          }
                      };

                    PeopleInfo.get(TAG_NAMES.PEOPLE_INFO).then(success, error);
                    WidgetHome.items = [];
                    searchOptions.skip = 0;
                    WidgetHome.busy = false;
                    WidgetHome.loadMore();
                    $scope.$digest();
                });
            }]);
})(window.angular, window);
