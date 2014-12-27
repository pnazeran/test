modone = angular.module('modone', [])
    .controller('DeskCtrl', ['$scope', function($scope) {
        $scope.name = 'Desk Controller'
        $scope.skyts = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']
        $scope.debug=''
        $scope.$on('swipeleft', function() {
            $scope.debug= 'swipeleft'
        })
        $scope.$on('swiperight', function() {
            $scope.debug= 'swiperight'
        })
        $('#edit_left').css('width', window.innerWidth * 0.3 +'px')
    }])
    .filter('Offset', [function() {
        return function(obj, offset, size) {
            if(offset < 0)
                offset = offset % obj.length + obj.length
            var res = []
            for(var i=0;i<size && i<obj.length;i++)
                res.push(obj[(i + offset) % obj.length])
            return res
        }
    }])
    .directive('pane', function($rootScope) {
        return {
            link: function(scope, el, attr) {
                var setting = {'border': {'top': 40, 'bottom': 40, 'right': 90, 'left': 90}}
                var width = scope.width || 100
                var height = scope.height || 100
                scope._height = height
                scope._width = width
                var bgc = scope.bgc || "#aaa"
                var side = scope.side
                scope.skyts = scope.$parent.skyts
                scope.offset = {'pixel': 0, 'init_pixel': 0, 'card': 0} 
                scope.child = {'width': 270, 'height': 24}
                
                scope.name = 'Pane Directive'
                scope.style3 = {'overflow': 'hidden', 'display': 'inline-block', 'width': '100%', 'height': '100%'}
                scope.style2 = {'position': 'absolute', "background-color": bgc, 'top': '0px', 'bottom': '0px', 'left': (side=='right'?setting.border.right:0) + 'px', 'right': (side=='left'?setting.border.left:0) + 'px'}
                scope.style = {'position': 'absolute', 'z-index': scope.zi}
                if(scope.side == 'left' || scope.side == 'right') {
                    scope.style['top'] = setting.border.top + 'px'
                    scope.style['bottom'] = setting.border.bottom + 'px'
                    scope.style['width'] = width + 'px'
                    scope.style[scope.side] = (scope.initOpen?0:(setting.border[side] +13 +(side=='right'?8:0) - width)) + 'px'
                    scope.size = -4 + window.innerHeight / (24 + 16)
                }
                if(scope.side == 'top' || scope.side == 'bottom') {
                    scope.style['left'] = '0px'; //setting.border.left + 'px'
                    scope.style['right'] = '0px'; //setting.border.right + 'px'
                    scope.style['height'] = height + 'px'
                    scope.style[scope.side] = (scope.initOpen?0:(setting.border[side] - height)) + 'px'
                    scope.size =  + window.innerWidth / (270 + 16)
                }

                var slideIn = function(list, direction, slide, delay) {
                    delay = delay || 24
                    var seq = []
                    var anim = {'opacity': 0}
                    anim['translate' + direction] = slide + 'px'
                    list.velocity(anim, {'duration': 0})
                    anim['opacity'] = 1
                    anim['translate' + direction] = '0px'
                    for(var x in list) 
                        seq.push({'elements': list[x], 'properties': anim, 'options': {'duration': 300, 'sequenceQueue': false, 'delay': Math.sqrt(x) * delay}})
                    $.Velocity.RunSequence(seq)
                }
                var o = {'parent': angular.element(el[0]).children()[0]}
                o['child'] = angular.element(o.parent).children()[0]
                o['grandchildren'] = angular.element(angular.element(el[0]).children()[0]).children()[0].children

                var hO = new Hammer(el[0])
                var hI = new Hammer(o.parent)
                hI.get('pan').set({'direction': Hammer.DIRECTION_ALL});
                hI.on('tap', function(e) {
                    if(e.target.id == '') {
                        var animation = {}
                        animation[side] = 0
                        if(parseInt($(el[0]).css(side)) >= 0)
                            animation[side] =  setting.border[side] - (side=='top' || side=='bottom'?height:width-13-(side=='right'?8:0))
                        else
                            slideIn($(o.grandchildren), (side=='top'||side=='bottom'?'Y':'X'), (side=='top'||side=='left'?-80:80), (side=='top'||side=='bottom'?100:22))
                        $(el[0]).velocity(animation, {'duration': 200, 'easing': 'easeOutCubic'})
                    }
                })
                var its_me = true
                var its_scrolling = false
                hI.on('panstart', function(e) {
                    if(e.target.id != '' && (
                            ((side == 'left' || side == 'right') && Math.abs(e.deltaY) < Math.abs(e.deltaX))
                        ||  ((side == 'top' || side == 'bottom') && Math.abs(e.deltaY) > Math.abs(e.deltaX))
                        ))
                        its_me = false
                    else if((side == 'left' || side == 'right') && Math.abs(e.deltaY) > Math.abs(e.deltaX))
                        its_scrolling = true
                    else if((side == 'top' || side == 'bottom') && Math.abs(e.deltaY) < Math.abs(e.deltaX)) 
                        its_scrolling = true
                })
                scope.updated = false
                hI.on('panmove', function(e) {
                    if(its_scrolling) {
                        scope.$apply(function() {
                            scope.offset.pixel = scope.offset.init_pixel + (side=='left'||side=='right'?e.deltaY:e.deltaX)
                            if(scope.offset.pixel < -3*16 -(side=='left'||side=='right'?24:270)) {
                                scope.offset.init_pixel += +3*16 + (side=='left'||side=='right'?24:270)
                                scope.offset.pixel = scope.offset.init_pixel + (side=='left'||side=='right'?e.deltaY-24:e.deltaX-270) -3*16
                                scope.offset.card += 1
                            } else if(scope.offset.pixel > 0 && scope.offset.card > 0) {
                                scope.offset.init_pixel += -3*16 -(side=='left'||side=='right'?24:270)
                                scope.offset.pixel = scope.offset.init_pixel + (side=='left'||side=='right'?e.deltaY+24:e.deltaX+270) +3*16
                                scope.offset.card -= 1
                            }
                        })
                    } else if(its_me && parseInt($(el[0]).css(side)) >= 0) {
                        if(side == 'left' || side == 'right'){
                            scope._width = Math.max(setting.border[side], width + e.deltaX * (side=='right'?-1:1))
                            $(el[0]).css('width', scope._width + 'px')
                            $(o.grandchildren).css('width', scope._width - 150 + 'px')
                        } else {
                            scope._height = Math.max(setting.border[side], height + e.deltaY * (side=='bottom'?-1:1))
                            $(el[0]).css('height', scope._height + 'px')
                            $(o.grandchildren).css('height', scope._height - (side=='top'?87:22) + 'px')
                        }
                    }
                })
                hI.on('panend', function(e) {
                    if(its_me) {
                        width = parseInt($(el[0]).css('width'))
                        height = parseInt($(el[0]).css('height'))
                        if(side == 'top' || side == 'bottom')
                            $(o.grandchildren).css('height', height - (side=='top'?87:22) + 'px')
                    } else
                        its_me = true
                    if(its_scrolling) {
                        scope.offset.init_pixel = scope.offset.pixel
                        its_scrolling = false
                    }
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
			                    '<card side="{{side}}" height=167 ng-repeat="skyt in skyts | Offset:offset.card:size" index=$index>{{skyt}}</card>' + 
			                '</div>' +
			            '</paper-shadow>' + 
			          '</div>'
		}
    }).directive('card', ['$timeout', function($timeout) {
        return {
            link: function(scope, el, attr) {
                var setting = {'border': {'top': 40, 'bottom': 40, 'right': 20, 'left': 20}}
                var side = scope.$parent.$parent.side
                var bgc = '#eee'
                scope.height = scope.$parent.$parent._height - (side=='top'?87:0) - (side=='bottom'?22:0)
                scope.style={'padding': '16px'
                            , 'margin-top': '16px'
                            , 'margin-left': '16px'
                            , 'margin-bottom': '16px'
                            , 'background-color': bgc
                            , 'position': 'absolute'
                            , 'width': scope.$parent.$parent._width - 150 + 'px'
                }
                if(side == 'top' || side == 'bottom'){
                    scope.style['width'] = '270px'
                    scope.style['height'] = scope.height + 'px'
                    scope.style['display'] = 'inline-block'
                    scope.style['margin-left'] = 16 + (270 + 16*3)*scope.index + 'px'
                    if(side == 'top')
                        scope.style['margin-bottom'] = setting.border.bottom - 3 + 'px'
                    else {
                        scope.style['padding'] = '8px'
                        scope.style['margin-top'] = '3px' 
//                        scope.style['margin-left'] = '6px'
                        scope.style['margin-right'] = '6px'
                        scope.style['margin-bottom'] = '2px'
                    }
                } else {
                    scope.style['height'] ='24px'
                    scope.style['margin-top'] = 16 + (24+16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px' 
                    if(side == 'right')
                        scope.style['margin-left'] = setting.border.left + 'px'
                    else
                        scope.style['margin-right'] = setting.border.right + 'px'
                }
                var h = new Hammer(el[0])
                h.get('pan').set({'direction': Hammer.DIRECTION_ALL});
                h.on('tap', function(e) {
                })
                var its_scrolling = false
                h.on('panstart', function(e) {
                    if((side == 'left' || side == 'right') && Math.abs(e.deltaY) > Math.abs(e.deltaX))
                        its_scrolling = true
                    else if((side == 'top' || side == 'bottom') && Math.abs(e.deltaY) < Math.abs(e.deltaX))
                        its_scrolling = true
                })
                h.on('panmove', function(e) {
                    if(!its_scrolling) {
                        scope.$apply( function() {
                            if(side == 'top' || side == 'bottom') {
                                scope.style['margin-left'] = 16 + (270+16*3)*scope.index + e.deltaX + scope.$parent.$parent.offset.pixel + 'px'
                                scope.style['margin-top'] = setting.border.top - (side=='bottom'?37:24) + e.deltaY + 'px'
                                $(el[0]).css('margin-left', 16 + (270+16*3)*scope.index + e.deltaX + scope.$parent.$parent.offset.pixel + 'px')
                                $(el[0]).css('margin-top', setting.border.top - (side=='bottom'?37:24) + e.deltaY + 'px')
                            } else {
                                scope.style['margin-left'] = setting.border.left - (side=='left'?4:0) + e.deltaX + 'px'
                                scope.style['margin-top'] = 16 + (24+16*3)*scope.index + e.deltaY + scope.$parent.$parent.offset.pixel + 'px'
                                $(el[0]).css('margin-left', setting.border.left - (side=='left'?4:0) + e.deltaX + 'px')
                                $(el[0]).css('margin-top', 16 + (24+16*3)*scope.index + e.deltaY + scope.$parent.$parent.offset.pixel + 'px')
                            }
                        })
                    }
                })
                h.on('panend', function(e) {
                    if(!its_scrolling) {
                        if(side == 'top' || side == 'bottom') {
                            scope.$apply(function() {
                                scope.style['margin-left'] = 16 + (270 + 16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px'
                                scope.style['margin-top'] = setting.border.top - (side=='bottom'?37:24) + 'px'
                            })
                            $(el[0]).velocity({'margin-left': 16 + (270 + 16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px', 
                                               'margin-top': setting.border.top - (side=='bottom'?37:24) + 'px'}
                                            , {'duration': 300, easing: 'easeInOutCubic'})
                        } else {
/*
                            scope.$apply(function() {
                                scope.style['margin-left'] = setting.border.left - (side=='left'?4:0) + 'px';
                                scope.style['margin-top'] = 16 + (24+16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px';
                            })
                            $(el[0]).velocity({'margin-left': setting.border.left - (side=='left'?4:0) + 'px', 
                                               'margin-top': 16 + (24+16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px'}
                                            , {'duration': 300, easing: 'easeInOutCubic'})
*/
                            
//                            console.log($(el[0]).offset().top + ' ' + $(el[0]).offset().left + ' ' + $(el[0]).css('width') + ' ' + $(el[0]).css('height'))
                            $('#floating_card').css('top', $(el[0]).offset().top +'px').css('left', $(el[0]).offset().left +'px')
                                                .css('width', $(el[0]).css('width')).css('height', $(el[0]).css('height'))
                                                .css('padding', '16px').css('background-color', bgc).css('opacity', 1)
                            $('#floating_card').velocity({'top': '50px', 'left': '150px'
                                                        , 'width': window.innerWidth * 0.3 + 'px'}
                                                        , {'duration': 300, easing: 'linear'
                                                            , 'complete': function() {
                                                                $timeout(function() {$('#edit_left').html($(el[0]).html())}, 50)
                                                                $('#floating_card').velocity({'height': '400px', 'opacity': 0}, {'easing': 'easeInCirc'})
                                                            }
                                                        })
                            scope.$apply(function() {
                                scope.style['margin-left'] = setting.border.left - (side=='left'?4:0) + 'px';
                                scope.style['margin-top'] = 16 + (24+16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px';
                            })
                        }
                    } else 
                        its_scrolling = false
                })
                scope.$parent.$parent.$watch('offset', function(offset) {
                    if(side == 'top' || side == 'bottom') {
                        if(scope.$parent.$parent != null)
                            scope.style['margin-left'] = 16 + (270+16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px' 
                    } else {
                        if(scope.$parent.$parent != null)
                            scope.style['margin-top'] = 16 + (24+16*3)*scope.index + scope.$parent.$parent.offset.pixel + 'px' 
                    }
                }, true)
                if(side == 'top' || side == 'bottom')
                    scope.$parent.$parent.$watch('_height', function(offset) {
                        if(scope.$parent.$parent != null)
                            scope.style['height'] = scope.$parent.$parent._height - (side=='top'?87:22)+ 'px' 
                    }, true)
                if(side == 'left' || side == 'right')
                    scope.$parent.$parent.$watch('_width', function(offset) {
                        if(scope.$parent.$parent != null)
                            scope.style['width'] = scope.$parent.$parent._width -150 + 'px' 
                    }, true)
            },
            restrict: 'E',
            replace: true,
            scope: {index: '='},
            transclude: true,
            template: '<paper-shadow id="card" z="1" ng-style="style"><ng-transclude></ng-transclude></paper-shadow> '
        }
    }])