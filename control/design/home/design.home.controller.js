(function (angular) {
    angular
        .module('peoplePluginDesign')
        .controller('DesignHomeCtrl', ['$scope', 'Buildfire', 'TAG_NAMES', function ($scope, Buildfire, TAG_NAMES) {
            var DesignHome = this;
            var DesignHomeMaster;
            DesignHome.changeListLayout = function (layoutName) {
                if (layoutName) {
                    //DesignHome.peopleInfo.design.$$hashKey="123445";
                    if (!DesignHome.peopleInfo.design) {
                        DesignHome.peopleInfo.design = {};
                    }
                    DesignHome.peopleInfo.design.listLayout = layoutName;
                    saveData(function (err, data) {
                            if (err) {
                                return DesignHome.peopleInfo = angular.copy(DesignHomeMaster);
                            }
                            else if (data && data.obj) {
                                return DesignHomeMaster = data.obj;
                            }
                            $scope.$digest();
                        }
                    )
                }
            };
            DesignHome.changeItemLayout = function (layoutName) {
                if (layoutName) {
                    if (!DesignHome.peopleInfo.design) {
                        DesignHome.peopleInfo.design = {};
                    }
                    DesignHome.peopleInfo.design.itemLayout = layoutName;
                    saveData(function (err, data) {
                        if (err) {
                            DesignHome.peopleInfo = angular.copy(DesignHomeMaster);
                        }
                        else {
                            if (data && data.obj) {
                                DesignHomeMaster = data.obj;
                            }
                        }
                        $scope.$digest();
                    });
                }
            };
            function saveData(callback) {
                callback = callback || function () {
                };
                Buildfire.datastore.save(DesignHome.peopleInfo, TAG_NAMES.PEOPLE_INFO, callback);
            }
            function init() {
                DesignHome.layouts = [
                    {name: 'Layout1'},
                    {name: 'Layout2'},
                    {name: 'Layout3'},
                    {name: 'Layout4'},
                    {name: 'Layout5'},
                    {name: 'Layout6'},
                    {name: 'Layout7'},
                    {name: 'Layout8'},
                    {name: 'Layout9'},
                    {name: 'Layout10'}
                ];
                DesignHome.peopleInfo = {
                    design: {
                        listLayout: "",
                        itemLayout: "",
                        backgroundImage: ""
                    },
                    content: {
                        images: [
                            {
                                imageUrl: "",
                                links: ""
                            }
                        ],
                        description: ""
                    }
                };
                Buildfire.datastore.get(TAG_NAMES.PEOPLE_INFO, function (err, data) {
                    if (err) {
                        Console.log('------------Error in Design of People Plugin------------',err);
                    }
                    else if (data && data.data) {
                            DesignHome.peopleInfo = angular.copy(data.data);
                            DesignHomeMaster = angular.copy(data.data);
                            $scope.$digest();

                    }
                    else
                    console.log('------------------unable to load data---------------');
                });
            }
            init();
        }]);
})(window.angular);