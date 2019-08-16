/**
 * @file
 * Contains the slide overview directive.
 */

/**
 * Directive to show the slide overview.
 */
angular.module('ikShared').directive('ikSlideOverview', ['busService', '$filter',
  function (busService, $filter) {
    'use strict';

    return {
      restrict: 'E',
      scope: {
        ikSelectedSlides: '=',
        ikOverlay: '@'
      },
      controller: function ($scope, $filter, $controller, slideFactory, userService) {
        $controller('BaseSearchController', {$scope: $scope});

        // Get filter selection "all/mine" from localStorage.
        $scope.showFromUser = localStorage.getItem('overview.slide.search_filter_default') ?
          localStorage.getItem('overview.slide.search_filter_default') :
          'all';

        // Slides to display.
        $scope.slides = [];

        var previousSearchIds = null;

        /**
         * Updates the slides array by send a search request.
         */
        $scope.updateSearch = function updateSearch() {
          // Get search text from scope.
          $scope.baseQuery.text = $scope.search_text;

          $scope.loading = true;

          slideFactory.searchSlides($scope.baseQuery).then(
            function (data) {
              // Total hits.
              $scope.hits = data.hits;

              // Extract search ids.
              var ids = [];
              for (var i = 0; i < data.results.length; i++) {
                ids.push(data.results[i].id);
              }

              // Only extract new results if new results.
              if (previousSearchIds &&
                ids.length === previousSearchIds.length &&
                ids.every(function(v,i) { return v === previousSearchIds[i]})
              ) {
                $scope.loading = false;
                return;
              }

              previousSearchIds = ids;

              // Load slides bulk.
              slideFactory.loadSlidesBulk(ids).then(
                function success(data) {
                  $scope.slides = data;

                  $scope.loading = false;
                },
                function error(reason) {
                  busService.$emit('log.error', {
                    'cause': reason,
                    'msg': 'Hentning af søgeresultater fejlede.'
                  });
                  $scope.loading = false;
                }
              );
            }
          );
        };

        /**
         * Update search result on slide deletion.
         */
        $scope.$on('slide-deleted', function (data) {
          $scope.updateSearch();
        });

        /**
         * Update search result on slide deletion.
         */
        $scope.$on('slide-cloned', function (data) {
          $scope.updateSearch();
        });

        /**
         * Updates the search filter based on current orientation and user
         */
        $scope.setSearchFilters = function setSearchFilters() {
          delete $scope.baseQuery.filter;

          // No groups selected and "all" selected => select all groups and my.
          var selectedGroupIds = $filter('filter')($scope.userGroups, { selected: true }, true).map(function (group) {
            return group.id;
          });

          $scope.baseQuery.filter = $scope.baseBuildSearchFilter(selectedGroupIds);

          $scope.pager.page = 0;

          $scope.updateSearch();
        };

        /**
         * Returns true if slide is in selected slides array.
         *
         * @param slide
         * @returns {boolean}
         */
        $scope.slideSelected = function slideSelected(slide) {
          if (!$scope.ikSelectedSlides) {
            return false;
          }

          var res = false;

          $scope.ikSelectedSlides.forEach(function (element, index) {
            if (element.id == slide.id) {
              res = true;
            }
          });

          return res;
        };

        /**
         * Calculates if a scheduling is set and whether we are currently showing it or not.
         *
         * @param slide
         *   The current slide.
         *
         * @return
         *   True if the slide has a schedule set, and we are outside the scope of the schedule.
         */
        $scope.outOfSchedule = function outOfSchedule(slide) {
          if (slide.schedule_from && slide.schedule_to) { // From and to time is set.
            if (slide.schedule_from * 1000 < Date.now() && slide.schedule_to * 1000 > Date.now()) {
              // Current time is between from and to time (ie inside schedule).
              return false;
            }
            // Current time is set but is outside from and to time (ie out of schedule).
            return true;
          }
          // No schedule is set.
          return false;
        };

        /**
         * Emits the slideOverview.clickSlide event.
         *
         * @param slide
         */
        $scope.slideOverviewClickSlide = function slideOverviewClickSlide(slide) {
          $scope.$emit('slideOverview.clickSlide', slide);
        };

        /**
         * Is the slide scheduled for now?
         *
         * @param slide
         */
        $scope.slideScheduledNow = function slideScheduledNow(slide) {
          if (!slide.published) {
            return false;
          }

          var now = new Date();
          now = parseInt(now.getTime() / 1000);

          if (slide.hasOwnProperty('schedule_from') && now < slide.schedule_from) {
            return false;
          }
          else if (slide.hasOwnProperty('schedule_to') && now > slide.schedule_to) {
            return false;
          }

          return true;
        };

        /**
         * Get scheduled text for slide.
         *
         * @param slide
         */
        $scope.getScheduledText = function getScheduledText(slide) {
          var text = '';

          if (!slide.published) {
            text = text + "Ikke udgivet!<br/>";
          }

          if (slide.hasOwnProperty('schedule_from')) {
            text = text + "Udgivet fra: " + $filter('date')(slide.schedule_from * 1000, "dd/MM/yyyy HH:mm") + ".<br/>";
          }

          if (slide.hasOwnProperty('schedule_to')) {
            text = text + "Udgivet til: " + $filter('date')(slide.schedule_to * 1000, "dd/MM/yyyy HH:mm") + ".";
          }

          return text;
        };

        $scope.setSearchFilters();
      },
      templateUrl: 'bundles/os2displayadmin/apps/ikShared/elements/slideOverview/slide-overview-directive.html?' + window.config.version
    };
  }
]);
