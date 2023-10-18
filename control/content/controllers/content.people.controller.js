'use strict';
(function (angular, buildfire) {
  angular
    .module('peoplePluginContent')
    .controller('ContentPeopleCtrl', ['$scope', 'Location', '$modal', 'Buildfire', 'TAG_NAMES', 'STATUS_CODE', '$routeParams', 'RankOfLastItem', '$rootScope',
      function ($scope, Location, $modal, Buildfire, TAG_NAMES, STATUS_CODE, $routeParams, RankOfLastItem, $rootScope) {
        var _rankOfLastItem = RankOfLastItem.getRank();
        var ContentPeople = this;
        ContentPeople.isUpdating = false;
        ContentPeople.isNewItemInserted = false;
        ContentPeople.unchangedData = true;
        ContentPeople.linksSortableOptions = {
          handle: '> .cursor-grab'
        };

        var _data = {
          email: '',
          topImage: '',
          fName: '',
          lName: '',
          position: '',
          phone: '',
          deepLinkUrl: '',
          dateCreated: "",
          socialLinks: [],
          bodyContent: '',
          rank: _rankOfLastItem,
          searchEngineDocumentId: null
        };

        $scope.draft_email = '';

        const registerDeeplinkData = (name, id, imageUrl, callback) => {
          const recordData = {
            name,
            deeplinkData: { id },
            id,
            imageUrl,
          };

          buildfire.deeplink.registerDeeplink(recordData, (err, result) => {
            if (err) console.error(err);
            if(callback) callback();
          });
        };

        //Scroll current view to top when page loaded.
        buildfire.navigation.scrollTop();

        ContentPeople.item = {
          data: angular.copy(_data)
        };

        function myCustomURLConverter(url) {
          if (url && !/^https?:\/\//i.test(url)) {
            const parsedURL = new URL(url);

            if (!parsedURL.protocol) {
              return "https://" + url.replace("//", "");
            }
          }

          return url;
        }

        ContentPeople.bodyContentWYSIWYGOptions = {
          plugins: 'advlist autolink link image lists charmap print preview',
          skin: 'lightgray',
          trusted: true,
          theme: 'modern',
          urlconverter_callback: myCustomURLConverter,
          plugin_preview_width: "500",
          plugin_preview_height: "500"
        };
        /*
         Send message to widget that this page has been opened
         */

        updateMasterItem(ContentPeople.item);
        function updateMasterItem(item) {
          ContentPeople.masterItem = angular.copy(item);
        }

        function resetItem() {
          ContentPeople.item = angular.copy(ContentPeople.masterItem);
        }

        function isUnchanged(item) {
          return angular.equals(item, ContentPeople.masterItem);
        }

        function isValidItem(item, lastValidationRequest, callback) {
          if (window.ENABLE_UNIQUE_EMAIL && item.data.email) {
            var filter = {};
            filter['$and'] = [{ '$json.email': item.data.email }, {
              $or: [{ '$json.deleted': { $exists: false } },
              { '$json.deleted': { $ne: 'true' } }]
            }];

            filter['$json.__$Deleted'] = { $exists: false };
            Buildfire[window.DB_PROVIDER].search({ filter: filter }, TAG_NAMES.PEOPLE, function (err, result) {
              if (result && result.length > 0) {
                for (var i = 0; i < result.length; i++) {
                  if (result[i].id == item.id) {
                    callback(null, { isValid: true, lastValidationRequest: lastValidationRequest });
                    return;
                  }
                }
                callback('email_already_exists', { isValid: false, lastValidationRequest: lastValidationRequest });
                return;
              }
              callback(null, { isValid: true, lastValidationRequest: lastValidationRequest });
              return;
            });
          }
          else {
            callback(null, { isValid: item.data.fName || item.data.lName, lastValidationRequest: lastValidationRequest });
          }
        }

        /*On click button done it redirects to home*/
        ContentPeople.done = function () {
          if (ContentPeople.item && ContentPeople.item.id && ContentPeople.item.data) {
            if (!$scope.$$phase) $scope.$digest();

            let name = `${ContentPeople.item.data.fName} ${ContentPeople.item.data.lName}`;
            registerDeeplinkData(name, ContentPeople.item.id, ContentPeople.item.data.topImage, () => {
              $scope.savingPerson = false;
              if (!$scope.$$phase) $scope.$digest();

              buildfire.messaging.sendMessageToWidget({ type: "reload" });
              Buildfire.history.pop();
              Location.goToHome();
            });
          }
        };

        ContentPeople.cancel = function () {
          Buildfire.history.pop();
          Location.goToHome();
          buildfire.messaging.sendMessageToWidget({ type: "goHome" });
        }

        ContentPeople.getItem = function (itemId) {
          var setItem = function (item) {
            _data.dateCreated = item.data.dateCreated;
            _data.rank = item.data.rank;
            if (item && item.data && !item.data.deepLinkUrl) {
              ContentPeople.item.data.deepLinkUrl = Buildfire.deeplink.createLink({ id: item.id });
            }

            if (item && item.data) {
              $scope.draft_email = item.data.email;
            }

            if (item.data && item.data.socialLinks) {
              //For Zapier integrations, the socialLinks will come as a string, and not an object.
              if (typeof item.data.socialLinks === "string") {
                item.data.socialLinks = JSON.parse(item.data.socialLinks);
              }

              //For Zapier integrations, we will always receive a callNumber action, although it might be empty
              item.data.socialLinks.forEach(function (item, index, object) {
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
            updateMasterItem(ContentPeople.item);
            $scope.$digest();
          }
          Buildfire[window.DB_PROVIDER].getById(itemId, TAG_NAMES.PEOPLE, function (err, item) {
            if (err)
              throw console.error('There was a problem saving your data', err);
            ContentPeople.item = item;
            console.log("CONTROL ITEM", item)
            if (Object.keys(item.data).length === 0) {
              Buildfire[window.DB_PROVIDER].search({ 'id': $routeParams.id }, TAG_NAMES.PEOPLE, function (err, item) {
                console.log("CONTROL SEARCH", err, item)
                ContentPeople.item = item[0];
                setItem(item[0])
                $scope.$digest();
              })
            } else setItem(ContentPeople.item)


          });
        };

        if ($routeParams.itemId) {
          ContentPeople.getItem($routeParams.itemId);
        }

        ContentPeople.addNewItem = function (item, callback) {
          /*if (item.data)
              item.data.email = $scope.draft_email;*/
          ContentPeople.isNewItemInserted = true;
          _rankOfLastItem = _rankOfLastItem + 10;
          item.data.dateCreated = +new Date();
          item.data.rank = _rankOfLastItem;

          $scope.savingPerson = true;
          if (!$scope.$$phase) $scope.$digest();

          var insert = function (searchEngineDocument) {
            item.data.searchEngineDocumentId = searchEngineDocument ? searchEngineDocument.id : null;
            Buildfire[window.DB_PROVIDER].insert(item.data, TAG_NAMES.PEOPLE, false, function (err, data) {
              if (err) {
                ContentPeople.isNewItemInserted = false;
                $scope.savingPerson = false;
                if (!$scope.$$phase) $scope.$digest();
                return console.error('There was a problem saving your data');
              }

              let name = `${data.data.fName} ${data.data.lName}`;

              registerDeeplinkData(name, data.id, data.data.topImage, () => {
                RankOfLastItem.setRank(_rankOfLastItem);
                item.id = ContentPeople.item.id = data.id;
                _data.dateCreated = item.data.dateCreated;
                _data.rank = item.data.rank;
                updateMasterItem(item);
                ContentPeople.item.data.deepLinkUrl = Buildfire.deeplink.createLink({ id: data.id });
                buildfire.services.searchEngine.update({
                  ...searchEngineDocument,
                  tag: TAG_NAMES.PEOPLE,
                  data: {id: data.id }
                }, () => {
                  ContentPeople.item.data.searchEngineDocumentId = searchEngineDocument ? searchEngineDocument.id : null;
                  // Send message to widget as soon as a new item is created with its id as a parameter
                  // if (ContentPeople.item.id) {
                  //   buildfire.messaging.sendMessageToWidget({
                  //     id: ContentPeople.item.id,
                  //     type: 'AddNewItem'
                  //   });
                  // }
                  ContentPeople.isUpdating = false;

                  if (!$scope.$$phase) $scope.$digest();
                });
                callback();
              });
            });
          }

          if (
            item &&
            item.data &&
            (
              item.data.fName ||
              item.data.lName
            )
          ) {
            const x = {
              tag: TAG_NAMES.PEOPLE,
              title: item.data.fName + ' ' + item.data.lName,
              description: item.data.position
            };
            buildfire.services.searchEngine.insert(
              {
                tag: TAG_NAMES.PEOPLE,
                title: item.data.fName + ' ' + item.data.lName,
                description: item.data.position
              },
              (err, response) => {
                if (err) {
                  $scope.savingPerson = false;
                  if (!$scope.$$phase) $scope.$digest();
                }
                insert(response);
              }
            );
          } else {
            insert();
          }
        };

        ContentPeople.updateItemData = function (item, callback) {
          $scope.savingPerson = true;
          if (!$scope.$$phase) $scope.$digest();

          Buildfire[window.DB_PROVIDER].update(item.id, item.data, TAG_NAMES.PEOPLE, function (err) {

            let name = `${item.data.fName} ${item.data.lName}`;

            registerDeeplinkData(name, item.id, item.data.topImage, () => {
              updateMasterItem(item);
              ContentPeople.isUpdating = false;
              if (err) {
                $scope.savingPerson = false;
                if (!$scope.$$phase) $scope.$digest();
                return console.error('There was a problem saving your data');
              }

              if (item && item.data && item.data.searchEngineDocumentId) {
                const x = {
                  id: item.data.searchEngineDocumentId,
                  tag: TAG_NAMES.PEOPLE,
                  title: item.data.fName + ' ' + item.data.lName,
                  description: item.data.position
                };
                buildfire.services.searchEngine.update(
                  {
                    id: item.data.searchEngineDocumentId,
                    tag: TAG_NAMES.PEOPLE,
                    title: item.data.fName + ' ' + item.data.lName,
                    description: item.data.position,
                    data: { id: item.id }
                  },
                  () => { }
                );
              }
              if (!$scope.$$phase) $scope.$digest();
              callback();
            });
          })
        };

        ContentPeople.openEditLink = function (link, index) {
          var options = { showIcons: false };
          var callback = function (error, result) {
            if (error) {
              return console.error('Error:', error);
            }
            if (result === null) {
              return console.error('Error:Can not save data, Null record found.');
            }
            ContentPeople.item.data.socialLinks = ContentPeople.item.data.socialLinks || [];
            ContentPeople.item.data.socialLinks.splice(index, 1, result);
            $scope.$digest();
          };
          Buildfire.actionItems.showDialog(link, options, callback);
        };

        ContentPeople.onUpdateFn = Buildfire[window.DB_PROVIDER].onUpdate(function (event) {
          if (event && event.status) {
            switch (event.status) {
              case STATUS_CODE.INSERTED:
                console.info('Data inserted Successfully');
                Buildfire[window.DB_PROVIDER].get(TAG_NAMES.PEOPLE_INFO, function (err, result) {
                  if (err) {
                    return console.error('There was a problem saving your data', err);
                  }
                  result.data.content.rankOfLastItem = _rankOfLastItem;
                  Buildfire[window.DB_PROVIDER].save(result.data, TAG_NAMES.PEOPLE_INFO, function (err) {
                    if (err)
                      return console.error('There was a problem saving last item rank', err);
                  });
                });
                break;
              case STATUS_CODE.UPDATED:
                console.info('Data updated Successfully');
                break;
            }
          }
        });

        var linkOptions = { "icon": "true" };
        ContentPeople.linksSortableOptions = {
          handle: '> .cursor-grab'
        };

        ContentPeople.openAddLinkPopup = function () {
          var options = { showIcons: false };
          var callback = function (error, result) {
            if (error) {
              return console.error('Error:', error);
            }
            if (!ContentPeople.item.data.socialLinks) {
              ContentPeople.item.data.socialLinks = [];
            }
            if (result === null) {
              return console.error('Error:Can not save data, Null record found.');
            }
            if (result.action == "sendSms") {
              result.body = "Hello. How are you? This is a test message."
            }
            ContentPeople.item.data.socialLinks.push(result);
            $scope.$digest();
          };
          Buildfire.actionItems.showDialog(null, linkOptions, callback);
        };

        ContentPeople.removeLink = function (_index) {
          ContentPeople.item.data.socialLinks.splice(_index, 1);
        };

        var options = { showIcons: false, multiSelection: false };
        var callback = function (error, result) {
          if (error) {
            return console.error('Error:', error);
          }
          if (result.selectedFiles && result.selectedFiles.length) {
            ContentPeople.item.data.topImage = result.selectedFiles[0];
            $scope.$digest();
          }
        };

        ContentPeople.selectTopImage = function () {
          Buildfire.imageLib.showDialog(options, callback);
        };

        ContentPeople.removeTopImage = function () {
          ContentPeople.item.data.topImage = null;
        };

        var tmrDelayForPeoples = null;
        var lastUpdateRequest = null;

        var updateItemsWithDelay = function (item, callback) {
          clearTimeout(tmrDelayForPeoples);
          if (item.id)
            ContentPeople.isUpdating = false;
          ContentPeople.unchangedData = angular.equals(_data, item.data);

          if (!item.id && isUnchanged(item)) {
            buildfire.dialog.toast({
              message: "Please fill at least one field",
              type: 'danger',
              duration: 2500,
              hideDismissButton: true
            });
          }

          lastUpdateRequest = new Date();
          isValidItem(item, lastUpdateRequest, function (err, result) {
            $scope.error = {};
            if (!ContentPeople.isUpdating && !isUnchanged(item) && result.isValid && lastUpdateRequest == result.lastValidationRequest) {
              tmrDelayForPeoples = setTimeout(function () {
                console.log("inside   " + item.data.email);
                if (item.id) {
                  ContentPeople.updateItemData(item, callback);
                } else if (!ContentPeople.isNewItemInserted) {
                  ContentPeople.addNewItem(item, callback);
                }
              }, 0);
            }
            if (err) {
              if (!$scope.error)
                $scope.error = {};
              if (err == 'email_already_exists')
                $scope.error.emailExists = true;
            }
            if (!$scope.$$phase)
              $scope.$digest();
          });
        };

        ContentPeople.save = function () {
          var item = {};
          angular.copy(ContentPeople.item, item);
          item.data.email = $scope.draft_email ? $scope.draft_email.toLowerCase() : '';
          updateItemsWithDelay(item, () => {
              ContentPeople.done();
          });
        }

        // $scope.$watch(function () {
        //   var item = {};
        //   angular.copy(ContentPeople.item, item);
        //   item.data.email = $scope.draft_email ? $scope.draft_email.toLowerCase() : '';
        //   return item;
        // }, ContentPeople.updateItemsWithDelay, true);

        var timerDelay;
        var updateItemOnWidget = item => {
          clearTimeout(timerDelay);
          // if (item.id) {
            timerDelay = setTimeout(() => {
              buildfire.messaging.sendMessageToWidget({ type: "updateItem", item: item.data });
            }, 500);
          // }
        }

        $scope.$watch(function () {
          var item = {};
          angular.copy(ContentPeople.item, item);
          item.data.email = $scope.draft_email ? $scope.draft_email.toLowerCase() : '';
          return item;
        }, updateItemOnWidget, true);

        $scope.$on("$destroy", function () {
          console.log("^^^^^^^^^^^^^^^^^^");
          ContentPeople.onUpdateFn.clear();
        });
      }]);
})(window.angular, window.buildfire);
