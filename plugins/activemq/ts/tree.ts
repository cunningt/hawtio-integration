/// <reference path="../../includes.ts"/>
/// <reference path="activemqHelpers.ts"/>
/// <reference path="activemqPlugin.ts"/>

module ActiveMQ {

  _module.controller("ActiveMQ.TreeHeaderController", ["$scope", ($scope) => {
    $scope.expandAll = () => {
      (<any>$('#activemqtree')).treeview('expandAll', { silent: true });
    };

    $scope.contractAll = () => {
      (<any>$('#activemqtree')).treeview('collapseAll', { silent: true });
    };
  }]);

  _module.controller("ActiveMQ.TreeController", ["$scope", "$location", "workspace", "localStorage", (
      $scope,
      $location: ng.ILocationService,
      workspace: Jmx.Workspace,
      localStorage: WindowLocalStorage) => {

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateSelectionFromURL, 50);
    });


    $scope.$watch('workspace.tree', function () {
      reloadTree();
    });

    $scope.$on('jmxTreeUpdated', function () {
      reloadTree();
    });

    function reloadTree() {
      log.debug("workspace tree has changed, lets reload the activemq tree");

      var children: Array<Jmx.NodeSelection> = [];
      var tree = workspace.tree;
      if (tree) {
        var domainName = "org.apache.activemq";
        var folder = tree.get(domainName);
        if (folder) {
          children = folder.children;
        }
        if (children.length) {
          var firstChild = children[0];
          // the children could be AMQ 5.7 style broker name folder with the actual MBean in the children
          // along with folders for the Queues etc...
          if (!firstChild.typeName && firstChild.children.length < 4) {
            // lets avoid the top level folder
            var answer = [];
            angular.forEach(children, (child) => {
              answer = answer.concat(child.children);
            });
            children = answer;
          }
        }

        // filter out advisory topics
        children.forEach(broker => {
          var grandChildren = broker.children;
          if (grandChildren) {
            const old = _.find(grandChildren, n => n.text === "Topic");
            if (old) {
              // we need to store all topics the first time on the workspace
              // so we have access to them later if the user changes the filter in the preferences
              var key = "ActiveMQ-allTopics-" + broker.text;
              var allTopics = _.clone(old.children);
              workspace.mapData[key] = allTopics;

              var filter = Core.parseBooleanValue(localStorage["activemqFilterAdvisoryTopics"]);
              if (filter) {
                if (old && old.children) {
                  var filteredTopics = _.filter(old.children, (c:any) => !_.startsWith(c.text, "ActiveMQ.Advisory"));
                  old.children = filteredTopics;
                }
              } else if (allTopics) {
                old.children = allTopics;
              }
            }
          }
        });

        var treeElement = $("#activemqtree");
        Jmx.enableTree($scope, $location, workspace, treeElement, children);
        // lets do this asynchronously to avoid Error: $digest already in progress
        setTimeout(updateSelectionFromURL, 50);
      }
    }

    function updateSelectionFromURL() {
      Jmx.updateTreeSelectionFromURLAndAutoSelect($location, $("#activemqtree"), (first) => {
        // use function to auto select the queue folder on the 1st broker
        var queues = first.getChildren()[0];
        if (queues && queues.data.title === 'Queue') {
          first = queues;
          first.expand(true);
          return first;
        }
        return null;
      }, true);
    }
  }]);
}
