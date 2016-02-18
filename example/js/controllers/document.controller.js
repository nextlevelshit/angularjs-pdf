app.controller('DocCtrl', function($scope) {

  $scope.pdfName = 'Relativity: The Special and General Theory by Albert Einstein';
  $scope.pdfUrl = 'pdf/libre.pdf';
  $scope.scroll = 0;
  $scope.loading = true;

  $scope.getNavStyle = function(scroll) {
    if(scroll > 100) return 'pdf-controls fixed';
    else return 'pdf-controls';
  }

  $scope.onError = function(error) {
    console.log(error);
  }

  $scope.onLoad = function() {
    $scope.loading = false;
  }

  $scope.onProgress = function(progress) {
    console.log(progress);
  }

});
