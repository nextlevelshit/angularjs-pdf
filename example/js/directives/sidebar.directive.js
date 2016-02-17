'use strict';

angular.module('pdf')
  .directive('pdfSidebar', function(){
    return {
      restrict: '',
      scope: {},
      templateUrl: function(element, attr) {
        return attr.templateUrl ? attr.templateUrl : 'templates/sidebar.tpl.html';
      },
      link: function(scope, element, attrs){
        return;
      }
    };
  });
