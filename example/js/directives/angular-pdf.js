/*! Angular-PDF Version: 1.3.0 | Released under an MIT license */
(function() {

  'use strict';

  angular.module('pdf', []).directive('ngPdf', [ '$window', '$compile', function($window, $compile) {
    var renderTask = null;
    var pdfLoaderTask = null;
    var debug = false;

    var backingScale = function(canvas) {
      var ctx = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      var bsr = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;

      return dpr / bsr;
    };

    var setCanvasDimensions = function(canvas, w, h) {
      var ratio = backingScale(canvas);
      canvas.width = Math.floor(w * ratio);
      canvas.height = Math.floor(h * ratio);
      canvas.style.width = Math.floor(w) + 'px';
      canvas.style.height = Math.floor(h) + 'px';
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
      return canvas;
    };
    return {
      restrict: 'E',
      templateUrl: function(element, attr) {
        return attr.templateUrl ? attr.templateUrl : 'partials/viewer.html';
      },
      link: function(scope, element, attrs) {
        element.css('display', 'block');
        var url = scope.pdfUrl;
        var httpHeaders = scope.httpHeaders;
        var pdfDoc = null;
        var pageToDisplay = isFinite(attrs.page) ? parseInt(attrs.page) : 1;
        var pageFit = attrs.scale === 'page-fit';
        var scale = attrs.scale > 0 ? attrs.scale : 1;

        //Set the canvas height and width to the height and width of the viewport
        var canvasid = attrs.canvasid || 'pdf-canvas';
        var $canvas = angular.element(document).find('#' + canvasid);
        var canvas = document.getElementById(canvasid);
        var ctx = canvas.getContext('2d');

        //Append the canvas to the pdf container div
        var $pdfContainer = angular.element(document).find('#pdfContainer');
        $pdfContainer.css('height', canvas.height + 'px').css('width', canvas.width + 'px');
        $pdfContainer.append($canvas);


        debug = attrs.hasOwnProperty('debug') ? attrs.debug : false;
        var creds = attrs.usecredentials;
        var windowEl = angular.element($window);

        windowEl.on('scroll', function() {
          scope.$apply(function() {
            scope.scroll = windowEl[0].scrollY;
          });
        });

        PDFJS.disableWorker = true;
        scope.pageNum = pageToDisplay;

        scope.renderPage = function(num) {
          if (renderTask) {
              renderTask._internalRenderTask.cancel();
          }

          pdfDoc.getPage(num).then(function(page) {
            var viewport;
            var pageWidthScale;
            var renderContext;

            if (pageFit) {
              viewport = page.getViewport(1);
              var clientRect = element[0].getBoundingClientRect();
              pageWidthScale = clientRect.width / viewport.width;
              scale = pageWidthScale;
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Arrange text layer
            //var canvasOffset = $canvas.offset();
            var $textLayerDiv = angular.element('<div />')
                .addClass('textLayer')
                .css('height', viewport.height + 'px')
                .css('width', viewport.width + 'px')
                /*.offset({
                  top: canvasOffset.top,
                  left: canvasOffset.left
                })*/
                ;

            element.append($textLayerDiv);
            $compile($textLayerDiv)(scope);

            //The following few lines of code set up scaling on the context if we are on a HiDPI display
            if (scale.scaled) {
              var cssScale = 'scale(' + (1 / scale.sx) + ', ' +
                  (1 / scale.sy) + ')';
              CustomStyle.setProp('transform', canvas, cssScale);
              CustomStyle.setProp('transformOrigin', canvas, '0% 0%');

              if ($textLayerDiv.get(0)) {
                CustomStyle.setProp('transform', $textLayerDiv.get(0), cssScale);
                CustomStyle.setProp('transformOrigin', $textLayerDiv.get(0), '0% 0%');
              }
            }

            ctx._scaleX = scale.sx;
            ctx._scaleY = scale.sy;
            if (scale.scaled) {
              ctx.scale(scale.sx, scale.sy);
            }

            $pdfContainer.append($textLayerDiv);

            setCanvasDimensions(canvas, viewport.width, viewport.height);

            page.getTextContent().then(function (textContent) {
              var textLayer = new TextLayerBuilder($textLayerDiv.get(0), 0);

              textLayer.setTextContent(textContent);

              renderContext = {
                canvasContext: ctx,
                viewport: viewport,
                textLayer: textLayer
              };

              renderTask = page.render(renderContext);
              renderTask.promise.then(function() {
                if (typeof scope.onPageRender === 'function') {
                  scope.onPageRender();
                }
              }).catch(function (reason) {
                console.log(reason);
              });
            });
          });
        };

        scope.goPrevious = function() {
          if (scope.pageToDisplay <= 1) {
            return;
          }
          scope.pageToDisplay = parseInt(scope.pageToDisplay) - 1;
          scope.pageNum = scope.pageToDisplay;
        };

        scope.goNext = function() {
          if (scope.pageToDisplay >= pdfDoc.numPages) {
            return;
          }
          scope.pageToDisplay = parseInt(scope.pageToDisplay) + 1;
          scope.pageNum = scope.pageToDisplay;
        };

        scope.zoomIn = function() {
          pageFit = false;
          scale = parseFloat(scale) + 0.2;
          scope.renderPage(scope.pageToDisplay);
          return scale;
        };

        scope.zoomOut = function() {
          pageFit = false;
          scale = parseFloat(scale) - 0.2;
          scope.renderPage(scope.pageToDisplay);
          return scale;
        };

        scope.fit = function() {
          pageFit = true;
          scope.renderPage(scope.pageToDisplay);
        }

        scope.changePage = function() {
          scope.renderPage(scope.pageToDisplay);
        };

        scope.rotate = function() {
          if (canvas.getAttribute('class') === 'rotate0') {
            canvas.setAttribute('class', 'rotate90');
          } else if (canvas.getAttribute('class') === 'rotate90') {
            canvas.setAttribute('class', 'rotate180');
          } else if (canvas.getAttribute('class') === 'rotate180') {
            canvas.setAttribute('class', 'rotate270');
          } else {
            canvas.setAttribute('class', 'rotate0');
          }
        };

        function clearCanvas() {
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }

        function renderPDF() {
          clearCanvas();

          var params = {
            'url': url,
            'withCredentials': creds
          };

          if (httpHeaders) {
            params.httpHeaders = httpHeaders;
          }

          if (url && url.length) {
            pdfLoaderTask = PDFJS.getDocument(params, null, null, scope.onProgress);
            pdfLoaderTask.then(
                function(_pdfDoc) {
                  if (typeof scope.onLoad === 'function') {
                    scope.onLoad();
                  }

                  pdfDoc = _pdfDoc;
                  scope.renderPage(scope.pageToDisplay);

                  scope.$apply(function() {
                    scope.pageCount = _pdfDoc.numPages;
                  });
                }, function(error) {
                  if (error) {
                    if (typeof scope.onError === 'function') {
                      scope.onError(error);
                    }
                  }
                }
            );
          }
        }

        scope.$watch('pageNum', function(newVal) {
          scope.pageToDisplay = parseInt(newVal);
          if (pdfDoc !== null) {
            scope.renderPage(scope.pageToDisplay);
          }
        });

        scope.$watch('pdfUrl', function(newVal) {
          if (newVal !== '') {
            if (debug) {
              console.log('pdfUrl value change detected: ', scope.pdfUrl);
            }
            url = newVal;
            scope.pageNum = scope.pageToDisplay = pageToDisplay;
            if (pdfLoaderTask) {
                pdfLoaderTask.destroy().then(function () {
                    renderPDF();
                });
            } else {
                renderPDF();
            }
          }
        });

      }
    };
  } ]);
})();
