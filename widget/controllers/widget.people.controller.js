'use strict';

(function (angular, window) {
    angular
        .module('peoplePluginWidget')
        .controller('WidgetPeopleCtrl', ['$scope', 'Buildfire', 'TAG_NAMES', 'ERROR_CODE', "Location", '$routeParams', '$sce', '$location', '$rootScope', '$timeout',
            function ($scope, Buildfire, TAG_NAMES, ERROR_CODE, Location, $routeParams, $sce, $location, $rootScope, $timeout) {
                // $rootScope.calledOnce = false;
                // let strings = new buildfire.services.Strings("en-us", stringsConfig);
                // buildfire.datastore.get("$bfLanguageSettings_en-us", (e, r) => {
                //     $scope.contact = "Contact";
                //     $scope.share = "Share";
                //     if (r && r.data && r.data.screenOne) {

                //         let screenOne = r.data.screenOne;
                //         if (screenOne.contact) {
                //             if (screenOne.contact.value)
                //                 $scope.contact = screenOne.contact.value;
                //             else {
                //                 $scope.contact = screenOne.contact.defaultValue;
                //             }
                //         }
                //         if (screenOne.share) {
                //             if (screenOne.share.value)
                //                 $scope.share = screenOne.share.value;
                //             else {
                //                 $scope.share = screenOne.share.defaultValue;
                //             }
                //         }
                //     }
                //     console.log(r);
                // });
                var WidgetPeople = this;
                var currentItemLayout,
                    currentListLayout;
                var DEFAULT_LIST_LAYOUT = 'list-layout-1',
                    DEFAULT_ITEM_LAYOUT = 'item-layout-1';
                WidgetPeople.defaults = {
                    DEFAULT_LIST_LAYOUT: 'list-layout-1',
                    DEFAULT_ITEM_LAYOUT: 'item-layout-1',
                    DEFAULT_SORT_OPTION: "Manually"
                };
                var breadCrumbFlag = true;

                buildfire.history.get('pluginBreadcrumbsOnly', function (err, result) {
                    if (result && result.length) {
                        result.forEach(function (breadCrumb) {
                            if (breadCrumb.label == 'Person') {
                                breadCrumbFlag = false;
                            }
                        });
                    }
                    if (breadCrumbFlag) {
                        buildfire.history.push('Person', { elementToShow: 'Person' });
                    }
                });

                /*
                 Send message to Control that this page has been opened
                 */
                var _searchObj = $location.search();
                if ($routeParams.id && !_searchObj.stopSwitch) {
                    $routeParams.showHome = false;
                    console.log($location.search());
                    buildfire.messaging.sendMessageToControl({ id: $routeParams.id, type: 'OpenItem' });
                }
                $rootScope.showHome = false;
                WidgetPeople.hideEmail = window.HIDE_EMAILS;
                WidgetPeople.actionButtonText = window.ACTION_ITEM_TEXT;
                WidgetPeople.enableShare = window.ENABLE_SHARE;
                if (!WidgetPeople.actionButtonText) WidgetPeople.actionButtonText = "Contact";
                /*declare the device width heights*/
                WidgetPeople.deviceHeight = window.innerHeight;
                WidgetPeople.deviceWidth = window.innerWidth;

                /*initialize the device width heights*/
                var initDeviceSize = function (callback) {
                    WidgetPeople.deviceHeight = window.innerHeight;
                    WidgetPeople.deviceWidth = window.innerWidth;
                    if (callback) {
                        if (WidgetPeople.deviceWidth == 0 || WidgetPeople.deviceHeight == 0) {
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

                /*crop image on the basis of width heights*/
                WidgetPeople.cropImage = function (url, settings) {
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

                WidgetPeople.safeHtml = function (html) {
                    if (html)
                        return $sce.trustAsHtml(html);
                };

                WidgetPeople.share = function (item) {
                    let link = {};
                    link.title = item.fName + ' ' + item.lName;
                    link.type = "website";
                    link.description = item.position ? item.position : null;
                    link.imageUrl = item.topImage ? item.topImage : null;
                    link.data = {
                        "id": $routeParams.id
                    };

                    buildfire.deeplink.generateUrl(link, function (err, result) {
                        if (err) {
                            console.error(err)
                        } else {
                            buildfire.device.share({ 
                                subject: link.title,
                                text: link.title,
                                image: 'http://myImageUrl',
                                link: result.url
                             }, function (err,result) {
                                if (err)
                                    alert(err);
                             });
                        }
                    });
                };
                WidgetPeople.sendMail = function (mail) {
                        buildfire.actionItems.execute({action: "sendEmail", email: mail}, function(err, result) {})
                }
                WidgetPeople.callPhone = function (tel) {
                    buildfire.actionItems.execute({action: "callNumber", phoneNumber: tel}, function(err, result) {})
                }
                var itemId = $routeParams.id;
                var getPeopleDetail = function () {

                    Buildfire[window.DB_PROVIDER].getById(itemId, TAG_NAMES.PEOPLE, function (err, result) {
                        if (err && err.code !== ERROR_CODE.NOT_FOUND) {
                            console.error('-----------Unable to load data-------------', err);
                            $rootScope.showHome = true;
                            buildfire.history.pop();
                        }
                        else {
                            if(!result.id) {
                                $rootScope.showHome = true;
                                buildfire.history.pop();
                            }
                            $rootScope.showHome = false;

                            if (result.data && result.data.socialLinks) {
                                //For Zapier integrations, the socialLinks will come as a string, and not an object.
                                if (typeof result.data.socialLinks === "string") {
                                    result.data.socialLinks = JSON.parse(result.data.socialLinks);
                                }

                                //For Zapier integrations, we will always receive a callNumber action, although it might be empty
                                result.data.socialLinks.forEach(function (item, index, object) {
                                    if (item.action === "callNumber" && item.phoneNumber === "") {
                                        object.splice(index, 1);
                                    }
                                });

                                result.data.socialLinks.forEach(function (item, index, object) {
                                    if (item.action === "callNumber") {
                                        if (item.phoneNumber === "") {
                                            object.splice(index, 1);
                                        }
                                        else {
                                            item.phoneNumber = item.phoneNumber.replace(/\D+/g, "");
                                        }
                                    }
                                });
                            }

                            WidgetPeople.item = result.data; 
                            //WidgetPeople.item = {"email":"nenor1995@gmail.com","topImage":"https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjQ0MDV9","fName":"Nedeljko","lName":"Ruzic","position":"Dev","phone":"+38766151304","deepLinkUrl":"appcba20875-ad8a-11e9-8fc5-06e43182e96c://plugin?dld={\"id\":\"5f2193a34f3d460651721008\"}","dateCreated":"","socialLinks":[],"bodyContent":"","rank":99999,"searchEngineDocumentId":"Jygom3MBS769KF4jtqXP"}
                            console.log(result.data)
                            if(Object.keys(result.data).length === 0) {
                                Buildfire[window.DB_PROVIDER].search({'id': $routeParams.id}, TAG_NAMES.PEOPLE, function (err, result) {
                                    console.log("SEARCH", err, result)
                                    WidgetPeople.item = result[0].data;
                                    //getContentPeopleInfo();
                                    buildfire.messaging.sendMessageToControl({ id: $routeParams.id, type: 'OpenItem' });
                                    $scope.$digest();
                                })
                            } else {
                                $scope.$digest();
                            }
                        }
                        bindOnUpdate();
                    });
                };
                var getContentPeopleInfo = function () {
                    Buildfire[window.DB_PROVIDER].get(TAG_NAMES.PEOPLE_INFO, function (err, result) {

                        if (err && err.code !== ERROR_CODE.NOT_FOUND) {
                            return console.error('-----------err-------------', err);
                        }
                        if (result && result.data) {
                            WidgetPeople.data = result.data;
                            if (!WidgetPeople.data.content) {
                                WidgetPeople.data.content = {
                                    sortBy: WidgetPeople.defaults.DEFAULT_SORT_OPTION
                                }
                            }
                            if (!WidgetPeople.data.design) {
                                WidgetPeople.data.design = {
                                    itemLayout: WidgetPeople.defaults.DEFAULT_ITEM_LAYOUT,
                                    listLayout: WidgetPeople.defaults.DEFAULT_LIST_LAYOUT
                                };
                            } else {
                                currentItemLayout = WidgetPeople.data.design.itemLayout;
                                currentListLayout = WidgetPeople.data.design.listLayout;
                            }
                            $scope.$digest();
                        } else {
                            throw ("Error with people plugin.");
                        }

                        getPeopleDetail();
                    });
                };
                getContentPeopleInfo();
                function bindOnUpdate() {
                    WidgetPeople.onUpdateFn = Buildfire[window.DB_PROVIDER].onUpdate(function (event) {
                        console.log("Hello--------1", event)
                        if (event && event.tag) {
                            switch (event.tag) {
                                case TAG_NAMES.PEOPLE:
                                    console.log('People iNfo updated-----------------', event.data);
                                    $rootScope.$broadcast('Item_Updated', event);
                                    if (event.data)
                                        WidgetPeople.item = event.data;
                                    console.log(WidgetPeople.item)
                                    break;
                                case TAG_NAMES.PEOPLE_INFO:
                                    WidgetPeople.data = event.data;
                                    if (event.data.design.backgroundImage) {
                                        $rootScope.backgroundImage = event.data.design.backgroundImage;
                                    }
                                    else {
                                        $rootScope.backgroundImage = ""
                                    }
                                    if (event.data.design.itemLayout && currentItemLayout != event.data.design.itemLayout) {
                                        WidgetPeople.data.design.itemLayout = event.data.design.itemLayout;
                                        currentItemLayout = event.data.design.itemLayout;

                                    }
                                    else if (event.data.design.listLayout && currentListLayout != event.data.design.listLayout) {
                                        Location.goToHome();
                                    }
                                    break;
                                case 'dbProvider':
                                    console.log(event)
                                    WidgetPeople.enableShare = event.data.enableShare;
                                    break;
                            }
                            $scope.$digest();
                            buildfire.appearance.ready();
                        }
                    });
                }

                $scope.$on("$destroy", function () {
                    WidgetPeople.onUpdateFn.clear();

                    $rootScope.$broadcast('ROUTE_CHANGED', WidgetPeople.data.design.listLayout, WidgetPeople.data.design.itemLayout, WidgetPeople.data.design.backgroundImage, WidgetPeople.data);
                });
                WidgetPeople.openLinks = function (actionItems) {
                    if (actionItems && actionItems.length) {
                        var options = {};
                        var callback = function (error, result) {
                            if (error) {
                                console.error('Error:', error);
                            }
                        };
                        buildfire.actionItems.list(actionItems, options, callback);
                    }
                };

                Buildfire[window.DB_PROVIDER].onRefresh(function () {
                    console.log("REFRESH")
                    getPeopleDetail();
                });

            }])
})(window.angular, window);
