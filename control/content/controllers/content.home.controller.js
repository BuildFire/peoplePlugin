'use strict';

(function (angular, buildfire) {
  angular
    .module('peoplePluginContent')
    .controller('ContentHomeCtrl', ['$scope', '$modal', 'Buildfire', '$csv', 'SORT', 'TAG_NAMES', 'ERROR_CODE', 'RankOfLastItem', '$timeout', 'Location', '$sce', 'PeopleInfo', '$rootScope',
      function ($scope, $modal, Buildfire, FormatConverter, SORT, TAG_NAMES, ERROR_CODE, RankOfLastItem, $timeout, Location, $sce, PeopleInfo, $rootScope) {
        /**
         * List of options available for sorting people list.
         * */
        var header = {
          topImage: "Image URL",
          fName: "First Name",
          lName: "Last Name",
          email: "Email",
          phone: "Phone Number",
          position: "Position",
          bodyContent: "Information"
        };

          /**
           * SearchOptions are using for searching , sorting people and fetching people list
           * @type object
           */

        //Scroll current view to top when page loaded.
        buildfire.navigation.scrollTop();

        function isValidItem(item, index, array) {
          return item.fName || item.lName;
        }

        function validateCsv(items) {
          if (!Array.isArray(items) || !items.length) {
            return false;
          }
          return items.every(isValidItem);
        }

        var initialLoad = false;
        var ContentHome = this;
        ContentHome.searchOptions = {
              filter: {"$json.fName": {"$regex": '/*'}},
              skip: SORT._skip,
              limit: SORT._limit + 1 // the plus one is to check if there are any more
        };

        var providers = {
          datastore: 'Datastore (Default)',
          publicData: 'Public Data'
        };

        $scope.selectedProvider = providers[window.DB_PROVIDER];
        $scope.changeDbProvider= function(selectedProvider){
          Buildfire.datastore.save({
            provider: selectedProvider
          }, TAG_NAMES.DB_PROVIDER, function (err, result) {
            if (err) {
              console.error(err);
            }
            else if (result) {
              location.reload();
            } else {
              console.error("Db Provider not saved!");
            }
          });
        };
        /**
         * ContentHome.busy used to enable/disable infiniteScroll. if busy true it means there is not more data.
         * @type {boolean}
         */
        ContentHome.busy = false;


        /**
         * ContentHome.items used to store the people list which fetched from server.
         * @type {null}
         */
        ContentHome.items = null;

        /**
         * ContentHome.data used to store PeopleInfo which fetched from server.
         * @type {null}
         */
        ContentHome.data = null;

        /**
         * ContentHome.sortingOptions are used to show options in Sort Items drop-down menu in home.html.
         * @type {*[]}
         */
        ContentHome.sortingOptions = [
          SORT.MANUALLY,
          SORT.OLDEST_TO_NEWEST,
          SORT.NEWEST_TO_OLDEST,
          SORT.FIRST_NAME_A_TO_Z,
          SORT.FIRST_NAME_Z_TO_A,
          SORT.LAST_NAME_A_TO_Z,
          SORT.LAST_NAME_Z_TO_A
        ];


        // create a new instance of the buildfire carousel editor
        var editor = new Buildfire.components.carousel.editor("#carousel");
        // this method will be called when a new item added to the list
        editor.onAddItems = function (items) {
          if (!ContentHome.data.content.images)
            ContentHome.data.content.images = [];
          ContentHome.data.content.images.push.apply(ContentHome.data.content.images, items);
          $scope.$digest();
        };
        // this method will be called when an item deleted from the list
        editor.onDeleteItem = function (item, index) {
          ContentHome.data.content.images.splice(index, 1);
          $scope.$digest();
        };
        // this method will be called when you edit item details
        editor.onItemChange = function (item, index) {
          ContentHome.data.content.images.splice(index, 1, item);
          $scope.$digest();
        };
        // this method will be called when you change the order of items
        editor.onOrderChange = function (item, oldIndex, newIndex) {
          var items = ContentHome.data.content.images;

          var tmp = items[oldIndex];

          if (oldIndex < newIndex) {
            for (var i = oldIndex + 1; i <= newIndex; i++) {
              items[i - 1] = items[i];
            }
          } else {
            for (var i = oldIndex - 1; i >= newIndex; i--) {
              items[i + 1] = items[i];
            }
          }
          items[newIndex] = tmp;

          ContentHome.data.content.images = items;
          $scope.$digest();
        };


        ContentHome.safeHtml = function (html) {
          if (html)
            return $sce.trustAsHtml(html);
        };

        function myCustomURLConverter(url, node, on_save, name) {
          if (!/^https?:\/\//i.test(url)) {
            return "https://" + url.replace("//", "");
          }
          else return url;
        }
        
        ContentHome.descriptionWYSIWYGOptions = {
          plugins: 'advlist autolink link image lists charmap print preview',
          skin: 'lightgray',
          trusted: true,
          theme: 'modern',
          urlconverter_callback : myCustomURLConverter,
          plugin_preview_width : "500",
          plugin_preview_height : "500"
        };
        ContentHome.data = PeopleInfo.data;
        if (!ContentHome.data.content.images)
          editor.loadItems([]);
        else
          editor.loadItems(ContentHome.data.content.images);

        RankOfLastItem.setRank(ContentHome.data.content.rankOfLastItem || 99999);
          /**
         * ContentHome.imageSortableOptions used for ui-sortable directory to drag-drop carousel images Manually.
         * @type object
         */
        ContentHome.imageSortableOptions = {
          handle: '> .cursor-grab'
        };

        /**
         * resetManualSorting(item, items) used to fix if two or matching ranks found.
         * @param items are the list of all items being sorted.
         */
        var resetManualSorting = function(items){
          var newMaxRank = items.length;
          for( var index = 0; index < items.length; index++ ) {
            var item = items[index];
            item.data.rank = index + 1;
            Buildfire[window.DB_PROVIDER].update(item.id, item.data, TAG_NAMES.PEOPLE, function (err) {
              if (err) {
                console.error('Error during fixing ranks');
              } else {
                if (ContentHome.data.content.rankOfLastItem < newMaxRank) {
                  ContentHome.data.content.rankOfLastItem = newMaxRank;
                  RankOfLastItem.setRank(newMaxRank);
                }
              }
            });
          }
        };

        /**
         * ContentHome.itemSortableOptions used for ui-sortable directory to sort people listing Manually.
         * @type object
         */
        ContentHome.itemSortableOptions = {
          handle: '> .cursor-grab',
          disabled: true,
          stop: function () {
            let { items } = ContentHome;
            for (let i = 0; i < items.length; i++) {
              const { id, data } = items[i];
              if (i == data.rank) continue;
              data.rank = i;
              Buildfire[window.DB_PROVIDER].update(id, data, TAG_NAMES.PEOPLE);
            }
          }
        };
        ContentHome.itemSortableOptions.disabled = !(ContentHome.data.content.sortBy === SORT.MANUALLY);

        ContentHome.DeepLinkCopyUrl = false;

        /**
         * tmrDelayForPeopleInfo is used to update peopleInfo after given time in setTimeOut.
         * @type {null}
         */
        var tmrDelayForPeopleInfo = null;

        // Send message to widget to return to list layout
        buildfire.messaging.sendMessageToWidget({type: 'Init'});

        /**
         * saveData(newObj, tag) used to save a new record in publicData.
         * @param newObj is a new/modified object.
         * @param tag is a tag name or identity given to the data json during saving the record.
         */
        var saveData = function (newObj, tag) {
          if (newObj == undefined)
            return;
          newObj.content.rankOfLastItem = newObj.content.rankOfLastItem || 0;
          Buildfire[window.DB_PROVIDER].save(newObj, tag , function (err, result) {
            if (err || !result) {
              console.error('------------error saveData-------', err);
            }
            else {
              RankOfLastItem.setRank(result.data.content.rankOfLastItem);
            }
          });
        };

        /**
         * getSearchOptions(value) is used to get searchOptions with one more key sort which decide the order of sorting.
         * @param value is used to filter sort option.
         * @returns object
         */
        var getSearchOptions = function (value) {
          ContentHome.itemSortableOptions.disabled = true;
          switch (value) {
            case SORT.OLDEST_TO_NEWEST:
              ContentHome.searchOptions.sort = {"dateCreated": 1};
              break;
            case SORT.NEWEST_TO_OLDEST:
                ContentHome.searchOptions.sort = {"dateCreated": -1};
              break;
            case SORT.FIRST_NAME_A_TO_Z:
                ContentHome.searchOptions.sort = {"fName": 1};
              break;
            case SORT.FIRST_NAME_Z_TO_A:
                ContentHome.searchOptions.sort = {"fName": -1};
              break;
            case SORT.LAST_NAME_A_TO_Z:
                ContentHome.searchOptions.sort = {"lName": 1};
              break;
            case SORT.LAST_NAME_Z_TO_A:
                ContentHome.searchOptions.sort = {"lName": -1};
              break;
            default :
              ContentHome.itemSortableOptions.disabled = false;
                ContentHome.searchOptions.sort = {"rank": 1};
              break;
          }
          return ContentHome.searchOptions;
        };

          /*unqiueList*/
          (function () {
              var unqiueList = {};

              $scope.validToAddItem = function (obj) {
                  if (!ContentHome.items || ContentHome.items.length < 1) {
                      return true;
                  }
                  if (window.ENABLE_UNIQUE_EMAIL && obj) {
                      var key = obj.data && obj.data.email ? obj.data.email.toLowerCase() : null;
                      if (unqiueList[key] || (typeof(obj.data.deleted) != "undefined" && obj.data.deleted.toString() == "true")) {
                          return false;
                      }
                  }
                  return true;
              };
              $scope.addToItems = function (obj) {
                  if (window.ENABLE_UNIQUE_EMAIL && obj) {
                      var key = obj.data && obj.data.email ? obj.data.email.toLowerCase() : null;
                      if (unqiueList[key] || (typeof(obj.data.deleted) != "undefined" && obj.data.deleted.toString() == "true")) {
                          return false;
                      }
                      if (!ContentHome.items) {
                          ContentHome.items = [];
                      }
                      ContentHome.items.push(obj);
                      if (key)
                          unqiueList[key] = obj.id;
                  }
                  else{
                      if (!ContentHome.items) {
                          ContentHome.items = [];
                      }
                      ContentHome.items.push(obj);
                  }
                  return true;
              };
              $scope.addItems = function (items) {
                  if (!ContentHome.items || ContentHome.items.length < 1) {
                      unqiueList = {};
                  }
                  if (items) {
                      for (var i = 0; i < items.length; i++) {
                          $scope.addToItems(items[i]);
                      }
                  }
              };
          })();

        /**
         * ContentHome.loadMore() called by infiniteScroll to implement lazy loading
         */
        ContentHome.noMore = false;
        ContentHome.loadMore = function (search) {
            Buildfire.spinner.show();
          if (ContentHome.busy) {
            return;
          }

          ContentHome.busy = true;
          if (ContentHome.data && ContentHome.data.content.sortBy && !search) {
              ContentHome.searchOptions = getSearchOptions(ContentHome.data.content.sortBy);
          }

          if (!ContentHome.searchOptions.filter['$and'])
                ContentHome.searchOptions.filter['$and'] = [];
          ContentHome.searchOptions.filter['$and'].push({
              $or: [{'$json.deleted': {$exists: false}},
                  {'$json.deleted': {$ne: 'true'}}]
          });

          Buildfire[window.DB_PROVIDER].search(ContentHome.searchOptions, TAG_NAMES.PEOPLE, function (err, result) {
            if (err) {
              Buildfire.spinner.hide();
              return console.error('-----------err in getting list-------------', err);
            }
            if (result.length <= SORT._limit) {// to indicate there are more
              ContentHome.noMore = true;
              Buildfire.spinner.hide();
            } else {
              result.pop();
              ContentHome.searchOptions.skip = ContentHome.searchOptions.skip + SORT._limit;
              ContentHome.noMore = false;
            }
            //ContentHome.items = ContentHome.items ? ContentHome.items.concat(result) : result;
            $scope.addItems(result);
            ContentHome.busy = false;
            Buildfire.spinner.hide();
            $scope.$digest();
          });
        };
        /**
         * Used to show/hide alert message when item's deep-link copied from people list.
         */
        ContentHome.openDeepLinkDialog = function (item) {
          ContentHome.DeepLinkCopyUrl = true;
          if(item && item.data && !item.data.deepLinkUrl) {
              item.data.deepLinkUrl = Buildfire.deeplink.createLink({id: item.id});
              ContentHome.updateItemData(item);
          }
          setTimeout(function () {
            ContentHome.DeepLinkCopyUrl = false;
            $scope.$apply();
          }, 1500);
        };

          ContentHome.updateItemData = function (item) {
              Buildfire[window.DB_PROVIDER].update(item.id, item.data, TAG_NAMES.PEOPLE, function (err, result) {
                  if (err)
                      return console.error('There was a problem saving your data');
              });
          };

        /**
         * method to open the importCSV Dialog
         */
        ContentHome.openImportCSVDialog = function () {

          buildfire.navigation.scrollTop();

          var modalInstance = $modal
            .open({
              templateUrl: 'templates/modals/import-csv.html',
              controller: 'ImportCSVPopupCtrl',
              controllerAs: 'ImportCSVPopup',
              size: 'sm'
            });
          modalInstance.result.then(function (rows) {
            Buildfire.spinner.show();
            if (rows && rows.length) {
              var rank = ContentHome.data.content.rankOfLastItem || 0;
              for (var index = 0; index < rows.length; index++) {
                rank += 10;
                rows[index].dateCreated = +new Date();
                rows[index].socialLinks = [];
                rows[index].rank = rank;
              }
              if (validateCsv(rows)) {
                var searchEngineInsertingFinished = false;
                for (var i = 0; i < rows.length; i++) {
                  var searchEngineInsert = function (counter) {
                    buildfire.services.searchEngine.insert(
                      {
                        tag: TAG_NAMES.PEOPLE,
                        title: rows[counter].fName + ' ' + rows[counter].lName,
                        description: rows[counter].position
                      },
                      (err, response) => {
                        if (err) {
                          searchEngineInsertingFinished = true;
                          return;
                        }
                        if (response && response.id) rows[counter].searchEngineDocumentId = response.id;
                        if (counter === rows.length - 1) searchEngineInsertingFinished = true;
                      }
                    );
                  }
                  searchEngineInsert(i);
                }

                var setDeepLinks = function (){
                  Buildfire[window.DB_PROVIDER].search({filter: {}, recordCount: true}, TAG_NAMES.PEOPLE, function(err, counter){
                    var numberOfRecords = counter.totalRecord;
                      for (let skip = 0; skip < numberOfRecords; skip += 50) {
                        Buildfire[window.DB_PROVIDER].search({filter: {}, skip, limit: 50}, TAG_NAMES.PEOPLE, function(err, res){
                          for (let i = 0; i < res.length; i += 1) { 
                            if(res[i].data.searchEngineDocumentId) {
                              buildfire.services.searchEngine.update(
                                {
                                  id: res[i].data.searchEngineDocumentId,
                                  tag: TAG_NAMES.PEOPLE,
                                  title: res[i].data.fName || '' + ' ' + res[i].data.lName || '',
                                  description: res[i].data.position,
                                  data: {
                                    id: res[i].id
                                  }
                                })
                            }
                          }
                        })
                      }
                  })
                }

                var intervalId = window.setInterval(function() {
                  if (searchEngineInsertingFinished) {
                    window.clearInterval(intervalId);
                    Buildfire[window.DB_PROVIDER].bulkInsert(rows, TAG_NAMES.PEOPLE, function (err, data) {
                      setDeepLinks();
                      Buildfire.spinner.hide();
                      $scope.$apply();
                      if (err) {
                        buildfire.notifications.alert('Failed to import CSV. Invalid file', function() {
    
                        });
                        console.error('There was a problem while importing the file----', err);
                      }
                      else {
                        console.info('File has been imported----------------------------');
                        ContentHome.busy = false;
                        ContentHome.noMore = false;
                        ContentHome.items = null;
                        ContentHome.searchOptions.skip = 0;
                        ContentHome.loadMore();
                        ContentHome.data.content.rankOfLastItem = rank;
                      }
                    });
                  }
                }, 1000);
                
                
              } else {
                Buildfire.spinner.hide();
                //$scope.$apply();
                ContentHome.csvDataInvalid = true;
                $timeout(function hideCsvDataError() {
                  ContentHome.csvDataInvalid = false;
                }, 2000)
              }
            }
            else {
              Buildfire.spinner.hide();
              $scope.$apply();
            }
          }, function (error) {
            Buildfire.spinner.hide();
           // $scope.$apply();
            //do something on cancel
          });
        };

        /**
         * ContentHome.exportCSV() used to export people list data to CSV
         */
        ContentHome.exportCSV = function () {
          getRecords({
              filter: {"$json.fName": {"$regex": '/*'}},
              skip: 0,
              limit: SORT._maxLimit + 1 // the plus one is to check if there are any more
            },
            []
            , function (err, data) {
              if (err) {
                return console.error('Err while exporting data--------------------------------', err);
              }
              if (data && data.length) {
                var persons = [];
                angular.forEach(angular.copy(data), function (value) {
                  delete value.data.dateCreated;
                  delete value.data.iconImage;
                  delete value.data.socialLinks;
                  delete value.data.rank;
                  persons.push(value.data);
                });
                var csv = FormatConverter.jsonToCsv(angular.toJson(persons), {
                  header: header
                });
                FormatConverter.download(csv, "Export.csv");
              }
              else {
                ContentHome.getTemplate();
              }
              records = [];
            });
        };
        /**
         * records holds the data to export the data.
         * @type {Array}
         */
        var records = [];

        /**
         * getRecords function get the  all items from DB
         * @param searchOption
         * @param records
         * @param callback
         */
        function getRecords(searchOption, records, callback) {
          console.log("Data length", records.length);
          Buildfire[window.DB_PROVIDER].search(searchOption, TAG_NAMES.PEOPLE, function (err, result) {
            if (err) {
              console.error('-----------err in getting list-------------', err);
              return callback(err, []);
            }
            if (result.length <= SORT._maxLimit) {// to indicate there are more
              records = records.concat(result);
              return callback(null, records);
            }
            else {
              result.pop();
              searchOption.skip = searchOption.skip + SORT._maxLimit;
              records = records.concat(result);
              return getRecords(searchOption, records, callback);
            }
          });
        }

        /**
         * ContentHome.getTemplate() used to download csv template
         */
        ContentHome.getTemplate = function () {
          var templateData = [{
            topImage: "",
            fName: "",
            lName: "",
            email: "",
            phone: "",
            position: "",
            bodyContent: ""
          }];
          var csv = FormatConverter.jsonToCsv(angular.toJson(templateData), {
            header: header
          });
          FormatConverter.download(csv, "Template.csv");
        };

        /**
         * ContentHome.removeListItem() used to delete an item from people list
         * @param _index tells the index of item to be deleted.
         */
        ContentHome.removeListItem = function (_index) {

          buildfire.navigation.scrollTop();

          var modalInstance = $modal.open({
            templateUrl: 'templates/modals/remove-people.html',
            controller: 'RemovePeoplePopupCtrl',
            controllerAs: 'RemovePeoplePopup',
            size: 'sm',
            resolve: {
              peopleInfo: function () {
                return ContentHome.items[_index];
              }
            }
          });
          modalInstance.result.then(function (message) {
            if (message === 'yes') {
              var item = ContentHome.items[_index];
                if (item.data.email && window.ENABLE_UNIQUE_EMAIL) {
                    Buildfire[window.DB_PROVIDER].searchAndUpdate({email: item.data.email}, {$set: {deleted: 'true'}}, TAG_NAMES.PEOPLE, function (err, result) {
                        Buildfire[window.DB_PROVIDER].search({filter: {'$json.email': item.data.email}}, TAG_NAMES.PEOPLE, function (err, result) {
                            if (result) {
                                for (var i = 0; i < result.length; i++) {
                                    if (result[i].data && result[i].data.searchEngineDocumentId) {
                                      buildfire.services.searchEngine.delete(
                                        {
                                          id: result[i].data.searchEngineDocumentId,
                                          tag: TAG_NAMES.PEOPLE
                                        }, 
                                        () => {}
                                      );
                                    }
                                    Buildfire[window.DB_PROVIDER].delete(result[i].id, TAG_NAMES.PEOPLE, function (err, result) {
                                    });
                                }
                            }
                            ContentHome.items.splice(_index, 1);
                            $scope.$digest();
                        });
                    });
                }
                else{
                    if (item && item.data && item.data.searchEngineDocumentId) {
                      buildfire.services.searchEngine.delete(
                        {
                          id: item.data.searchEngineDocumentId,
                          tag: TAG_NAMES.PEOPLE
                        }, 
                        () => {}
                      );
                    }
                    Buildfire[window.DB_PROVIDER].delete(item.id, TAG_NAMES.PEOPLE, function (err, result) {
                        if (err)
                            return;
                        ContentHome.items.splice(_index, 1);
                        $scope.$digest();
                    });
                }
            }
          }, function (data) {
            //do something on cancel
          });
        };

        /**
         * ContentHome.searchListItem() used to search people list
         * @param value to be search.
         */
        ContentHome.searchListItem = function (value) {
          var fullName = '';
          ContentHome.searchOptions.skip = 0;
          ContentHome.busy = false;
          ContentHome.items = null;
          if (value) {
            value = value.trim();
            if (value.indexOf(' ') !== -1) {
              fullName = value.split(' ');
              ContentHome.searchOptions.filter = {
                "$and": [{
                  "$json.fName": {
                    "$regex": fullName[0],
                    "$options": "i"
                  }
                }, {"$json.lName": {"$regex": fullName[1], "$options": "i"}}]
              };
            } else {
              fullName = value;
              ContentHome.searchOptions.filter = {
                "$or": [{
                  "$json.fName": {
                    "$regex": fullName,
                    "$options": "i"
                  }
                }, {"$json.lName": {"$regex": fullName, "$options": "i"}}]
              };
            }
          } else {
            ContentHome.searchOptions.filter = {"$json.fName": {"$regex": '/*'}};
          }
          ContentHome.loadMore('search');
        };

        /**
         * ContentHome.sortPeopleBy(value) used to sort people list
         * @param value is a sorting option
         */
        ContentHome.sortPeopleBy = function (value) {
          if (!value) {
            console.info('There was a problem sorting your data');
          } else {
            ContentHome.items = null;
            ContentHome.searchOptions.skip = 0;
            ContentHome.busy = false;
            ContentHome.data.content.sortBy = value;
            ContentHome.loadMore();
          }
        };

        /**
         * saveDataWithDelay(infoData) called when PEOPLE_INFO data get changed
         * @param infoData is the modified object returned by $scope.$watch.
         */
        var saveDataWithDelay = function (infoData) {
          if (infoData) {
            if (tmrDelayForPeopleInfo) {
              clearTimeout(tmrDelayForPeopleInfo);
            }
            tmrDelayForPeopleInfo = setTimeout(function () {
              if (initialLoad) {
                saveData(JSON.parse(angular.toJson(infoData)), TAG_NAMES.PEOPLE_INFO);
              }
              initialLoad = true;
            }, 500);
          }
        };

        /**
         * $scope.$watch used to determine that ContentHome.data has changed.
         */
        $scope.$watch(function () {
          return ContentHome.data;
        }, saveDataWithDelay, true);

      }]);
})(window.angular, window.buildfire);
