'use strict';

(function (angular, buildfire) {
  angular
    .module('peoplePluginWidget', [
      'peopleEnums',
      'peopleFilters',
      'peopleWidgetServices',
      'ngAnimate',
      'ngRoute',
      'ui.bootstrap',
      'infinite-scroll'
    ])
    .constant('TAG_NAMES', {
      PEOPLE_INFO: 'peopleInfo',
      PEOPLE: 'people',
      DB_PROVIDER:  'dbProvider'
    })
    .constant('ERROR_CODE', {
      NOT_FOUND: 'NOTFOUND'
    })
    .config(['$routeProvider', '$compileProvider', function ($routeProvider, $compileProvider) {

      /**
       * To make href urls safe on mobile
       */
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|cdvfile|file):/);


      $routeProvider
        .when('/', {
          template: '<div></div>'
        })
        .when('/people/:id', {
          templateUrl: 'templates/people.html',
          controllerAs: 'WidgetPeople',
          controller: 'WidgetPeopleCtrl'
        })
        .otherwise('/');
    }])
    .factory('Buildfire', [function () {
      return buildfire;
    }])
    .factory('Location', [function () {
      var _location = window.location;
      return {
        goTo: function (path) {
          _location.href = path;
        },
        goToHome: function () {
          _location.href = _location.href.substr(0, _location.href.indexOf('#'));
        }
      };
    }])
/*    .filter('getImageUrl', ['Buildfire', function (Buildfire) {
      filter.$stateful = true;
      function filter(url, width, height, type) {
        var _imgUrl;
        if (!_imgUrl) {
          if (type == 'resize') {
            Buildfire.imageLib.local.resizeImage(url, {
              width: width,
              height: height
            }, function (err, imgUrl) {
              _imgUrl = imgUrl;
            });
          } else {
            Buildfire.imageLib.local.cropImage(url, {
              width: width,
              height: height
            }, function (err, imgUrl) {
              _imgUrl = imgUrl;
            });
          }
        }

        return _imgUrl;
      }
      return filter;
    }])*/
    .directive("buildFireCarousel", ["$rootScope", function ($rootScope) {
      return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
          $rootScope.$broadcast("Carousel:LOADED");
        }
      };
    }])
    .directive("loadImage", ['Buildfire', function (Buildfire) {
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          element.attr("src", "../../../styles/media/holder-" + attrs.loadImage + ".gif");

            attrs.$observe('finalSrc', function() {
                var _img = attrs.finalSrc;

                if (attrs.cropType == 'resize') {
                    Buildfire.imageLib.local.resizeImage(_img, {
                        width: attrs.cropWidth,
                        height: attrs.cropHeight
                    }, function (err, imgUrl) {
                        _img = imgUrl;
                        replaceImg(_img);
                    });
                } else {
                    Buildfire.imageLib.local.cropImage(_img, {
                        width: attrs.cropWidth,
                        height: attrs.cropHeight
                    }, function (err, imgUrl) {
                        _img = imgUrl;
                        replaceImg(_img);
                    });
                }
            });

            function replaceImg(finalSrc) {
                var elem = $("<img>");
                elem[0].onload = function () {
                    element.attr("src", finalSrc);
                    elem.remove();
                };
                elem.attr("src", finalSrc);
            }
        }
      };
    }])
    .run(['Location', '$location', '$rootScope', function (Location, $location, $rootScope) {
      buildfire.messaging.onReceivedMessage = function (msg) {
        switch (msg.type) {
          case 'AddNewItem':
            Location.goTo("#/people/" + msg.id + "?stopSwitch=true");
            break;
          case 'OpenItem':
            Location.goTo("#/people/" + msg.id);
            break;
          default:
            if ($rootScope.showHome == false)
              Location.goToHome();
        }
      };
      $rootScope.calledOnce = false;

      buildfire.deeplink.getData(function (data) {
        if (data && !$rootScope.calledOnce && data.id) {
          $rootScope.calledOnce = true;
          window.setTimeout(function() {
              Location.goTo("#/people/" + data.id);
          }, 0);
        }
      });

      buildfire.navigation.onBackButtonClick = function () {
        if (($location.path() != '/')) {
          buildfire.messaging.sendMessageToControl({});
          $rootScope.showHome = true;
          buildfire.history.get({
            pluginBreadcrumbsOnly: true
          },function(err, result){
              result.forEach(function() {
                buildfire.history.pop();
              });
          });
        } else {
          buildfire.navigation._goBackOne();
        }
        
      };

      buildfire.history.onPop(function(data, err){
        buildfire.messaging.sendMessageToControl({});
        $rootScope.showHome = true;
        Location.goTo('#/');
      })

    }]).filter('cropImage', [function () {
      function filter (url, width, height, noDefault) {
        var _imgUrl;
        filter.$stateful = true;
        if(noDefault)
        {
          if(!url)
            return '';
        }
        if (!_imgUrl) {
          buildfire.imageLib.local.cropImage(url, {
            width: width,
            height: height
          }, function (err, imgUrl) {
            _imgUrl = imgUrl;
          });
        }
        return _imgUrl;
      }
      return filter;
    }]).directive('backImg', ["$rootScope", function ($rootScope) {
      return function (scope, element, attrs) {
        attrs.$observe('backImg', function (value) {
          var img = '';
          if (value) {
            buildfire.imageLib.local.cropImage(value, {
              width: $rootScope.deviceWidth,
              height: $rootScope.deviceHeight
            }, function (err, imgUrl) {
              if (imgUrl) {
                img = imgUrl;
                element.attr("style", 'background:url(' + img + ') !important ; background-size: cover !important;');
              } else {
                img = '';
                element.attr("style", 'background-color:white');
              }
              element.css({
                'background-size': 'cover !important'
              });
            });
            // img = $filter("cropImage")(value, $rootScope.deviceWidth, $rootScope.deviceHeight, true);
          }
          else {
            img = "";
            element.attr("style", 'background-color:white');
            element.css({
              'background-size': 'cover !important'
            });
          }
        });
      };
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
              window.HIDE_EMAILS = result.data.hideEmails;
              window.ACTION_ITEM_TEXT = result.data.actionButtonText;
              window.ENABLE_SHARE = result.data.enableShare;
            angular.bootstrap(document, ['peoplePluginWidget']);
          } catch (err) {
            window.DB_PROVIDER = defaultProvider;
            window.ENABLE_UNIQUE_EMAIL = false;
            window.HIDE_EMAILS = false;
            window.ACTION_ITEM_TEXT = "Contact";
            window.ENABLE_SHARE = false;
            angular.bootstrap(document, ['peoplePluginWidget']);
          }
        });
    })
})(window.angular, window.buildfire);
