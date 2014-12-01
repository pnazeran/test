modone = angular.module('modone', [])
    .controller('DeskCtrl', ['$scope', function($scope) {
        $scope.name = 'Desk Controller'
        $scope.skyts = ['a', 'b', 'c']
        $scope.debug=''
        $scope.$on('swipeleft', function() {
            $scope.debug= 'swipeleft'
        })
        $scope.$on('swiperight', function() {
            $scope.debug= 'swiperight'
        })
    }])
    .directive('pane', function($rootScope) {
        return {
            link: function(scope, el, attr) {
                var setting = {'border': {'top': 40, 'bottom': 40, 'right': 90, 'left': 90}}
                var width = scope.width || 100
                var height = scope.height || 100
                scope._height = height
                var bgc = scope.bgc || "#aaa"
                var side = scope.side
                scope.skyts = scope.$parent.skyts
                
                scope.name = 'Pane Directive'
                scope.style3 = {'overflow': 'hidden', 'display': 'inline-block', 'width': '100%', 'height': '100%'}
                scope.style2 = {'position': 'absolute', "background-color": bgc, 'top': '0px', 'bottom': '0px', 'left': (side=='right'?setting.border.right:0) + 'px', 'right': (side=='left'?setting.border.left:0) + 'px'}
                scope.style = {'position': 'absolute', 'z-index': scope.zi}
                if(scope.side == 'left' || scope.side == 'right') {
                    scope.style['top'] = setting.border.top + 'px'
                    scope.style['bottom'] = setting.border.bottom + 'px'
                    scope.style['width'] = width + 'px'
                    scope.style[scope.side] = (scope.initOpen?0:(setting.border[side] + 10 - width)) + 'px'
                }
                if(scope.side == 'top' || scope.side == 'bottom') {
                    scope.style['left'] = setting.border.left + 'px'
                    scope.style['right'] = setting.border.right + 'px'
                    scope.style['height'] = height + 'px'
                    scope.style[scope.side] = (scope.initOpen?0:(setting.border[side] - height)) + 'px'
                }

                var slideIn = function(list, direction, slide) {
                    var seq = []
                    var anim = {'opacity': 0}
                    anim['translate' + direction] = slide + 'px'
                    list.velocity(anim, {'duration': 0})
                    anim['opacity'] = 1
                    anim['translate' + direction] = '0px'
                    for(x in list) 
                        seq.push({'elements': list[x], 'properties': anim, 'options': {'duration': 400, 'sequenceQueue': false, 'delay': x * 50}})
                    $.Velocity.RunSequence(seq)
                }
                var o = {'parent': angular.element(el[0]).children()[0]}
                o['child'] = angular.element(o.parent).children()[0]
                o['grandchildren'] = angular.element(angular.element(el[0]).children()[0]).children()[0].children

                var hO = new Hammer(el[0])
                var hI = new Hammer(o.parent)
                hI.on('tap', function(e) {
                    if(e.target.id == '') {
                        var animation = {}
                        animation[side] = 0
                        if(parseInt($(el[0]).css(side)) >= 0)
                            animation[side] =  setting.border[side] - (side=='top' || side=='bottom'?height:width-10)
                        else
                            slideIn($(o.grandchildren), (side=='top'||side=='bottom'?'Y':'X'), (side=='top'||side=='left'?-80:80))
                        $(el[0]).velocity(animation, {'duration': 200, 'easing': 'easeOutCubic'})
                    }
                })
                hI.on('panmove', function(e) {
                    if(parseInt($(el[0]).css(side)) >= 0) {
                        if(side == 'left' || side == 'right') 
                            $(el[0]).css('width', Math.max(setting.border[side], width + e.deltaX * (side=='right'?-1:1)) + 'px')
                        else
                            $(el[0]).css('height', Math.max(setting.border[side], height + e.deltaY * (side=='bottom'?-1:1)) + 'px')
                        if(side == 'top' || side == 'bottom')
                            $(o.grandchildren).css('height', Math.max(setting.border[side], height + e.deltaY * (side=='bottom'?-1:1)) - (side=='top'?84:0) - (side=='bottom'?22:0) + 'px')
                    }
                })
                hI.on('panend', function(e) {
                    width = parseInt($(el[0]).css('width'))
                    height = parseInt($(el[0]).css('height'))
                    if(side == 'top' || side == 'bottom')
                        $(o.grandchildren).css('height', height - (side=='top'?84:0) - (side=='bottom'?22:0) + 'px')
                })
                hO.on('swipeleft', function(e) {
                    $rootScope.$broadcast('swipeleft')
                    var animation = {}
                    animation[side] = 0
                    if(side == 'left' || side == 'right') {
                        if(side == 'right') 
                            slideIn($(o.grandchildren), (side=='top'||side=='bottom'?'Y':'X'), (side=='top'||side=='left'?-80:80))
                        else
                            animation[side] = 10+ setting.border[side] - (side=='top' || side=='bottom'?height:width)
                        $(el[0]).velocity(animation, {'duration': 200, 'easing': 'easeOutCubic'})
                    }
                })
                hO.on('swiperight', function(e) {
                    $rootScope.$broadcast('swiperight')
                    var animation = {}
                    animation[side] = 0
                    if(side == 'left' || side == 'right') {
                        if(side == 'left') 
                            slideIn(o.grandchildren, (side=='top'||side=='bottom'?'Y':'X'), (side=='top'||side=='left'?-80:80))
                        else
                            animation[side] = 10+ setting.border[side] - (side=='top' || side=='bottom'?height:width)
                        $(el[0]).velocity(animation, {'duration': 200, 'easing': 'easeOutCubic'})
                    }
                })

            },
			restrict: 'E', 
			replace: true,
			scope: {side: '@',
			        initOpen: '=',
			        width: '=',
			        height: '=',
			        bgc: '@',
			        zi: '='
			    },
		    transclude: true,
			template: '<div ng-style="style">' + 
			            '<paper-shadow z="{{zi}}" ng-style="style2">' + 
			                '<div ng-style="style3">' +
			                    '<card side="{{side}}" height=167 ng-repeat="skyt in skyts">{{skyt}}</card>' + 
			                '</div>' +
			            '</paper-shadow>' + 
			          '</div>'
		}
    }).directive('card', function() {
        return {
            link: function(scope, el, attr) {
                var setting = {'border': 40}
                var side = scope.$parent.$parent.side
                var bgc = '#eee'
                scope.height = scope.$parent.$parent._height - (side=='top'?84:0) - (side=='bottom'?22:0)
                scope.style={'padding': '16px'
                            , 'margin-top': '16px'
                            , 'margin-left': '16px'
                            , 'margin-right': '16px'
                            , 'margin-bottom': '16px'
                            , 'background-color': bgc
                }
                if(side == 'top' || side == 'bottom'){
                    scope.style['width'] = '270px'
                    scope.style['height'] = scope.height + 'px'
                    scope.style['display'] = 'inline-block'
                    if(side == 'top')
                        scope.style['margin-bottom'] = setting.border - 3 + 'px'
                    else {
                        scope.style['padding'] = '8px'
                        scope.style['margin-top'] = '3px'
                        scope.style['margin-left'] = '6px'
                        scope.style['margin-right'] = '6px'
                        scope.style['margin-bottom'] = '2px'
                    }
                } else {
                    scope.style['height'] ='24px'
                    if(side == 'right')
                        scope.style['margin-left'] = setting.border - 30 - 1 + 'px'
                    else
                        scope.style['margin-right'] = setting.border - 30 - 1 + 'px'
                }
                h = new Hammer(el[0], {domEvents: false} )
                h.on('tap', function(e) {
                    console.log('card')
                })
            },
            restrict: 'E',
            replace: true,
            scope: {},
            transclude: true,
            template: '<paper-shadow id="card" z="1" ng-style="style"><ng-transclude></ng-transclude></paper-shadow> '
        }
    })