(function() {
  angular.module('fixtable', []);

  angular.module('fixtable').controller('cellCtrl', [
    '$scope', '$rootScope', function($scope, $rootScope) {
      $scope.editing = false;
      $scope.getCellTemplate = function() {
        var editTemplate, normalTemplate;
        normalTemplate = $scope.col.template || $scope.options.cellTemplate;
        editTemplate = $scope.col.editTemplate || $scope.options.editTemplate;
        if ($scope.editing) {
          return editTemplate;
        } else {
          return normalTemplate;
        }
      };
      $scope.beginEdit = function() {
        if (!$scope.col.editable) {
          return;
        }
        $scope.editing = true;
        return $scope.$emit('fixtableBeginEdit');
      };
      $scope.endEdit = function() {
        $scope.editing = false;
        return $scope.$emit('fixtableEndEdit');
      };
      $scope.handleKeypress = function(event) {
        if (event.which === 13) {
          $scope.endEdit();
          return $scope.$emit('fixtableFocusOnCell', {
            colIndex: $scope.colIndex,
            rowIndex: $scope.rowIndex + 1
          });
        }
      };
      $rootScope.$on('fixtableBeginEdit', function(event) {
        if ($scope !== event.targetScope) {
          return $scope.editing = false;
        }
      });
      return $rootScope.$on('fixtableFocusOnCell', function(event, attrs) {
        if (attrs.colIndex === $scope.colIndex && attrs.rowIndex === $scope.rowIndex) {
          return $scope.beginEdit();
        }
      });
    }
  ]);

  angular.module('fixtable').directive('fixtable', [
    '$timeout', 'fixtableDefaultOptions', 'fixtableFilterTypes', function($timeout, fixtableDefaultOptions, fixtableFilterTypes) {
      return {
        link: function(scope, element, attrs) {
          var base, col, column, defaultFilterFn, defaultValues, filterAndSortData, fixtable, getCurrentFilterValues, getPageData, getSelectedItemIndex, i, index, j, k, key, len, len1, ref, ref1, updateData, value, valuesObj;
          for (key in fixtableDefaultOptions) {
            value = fixtableDefaultOptions[key];
            if (!Object.prototype.hasOwnProperty.call(scope.options, key)) {
              scope.options[key] = value;
            }
          }
          if (scope.options.rowSelection) {
            scope.options.columns.unshift({
              rowSelectionColumn: true,
              width: scope.options.rowSelectionColumnWidth
            });
          }
          scope.$parent.$watchCollection(scope.options.selectedItems, function(newData) {
            return scope.selectedItems = newData;
          });
          fixtable = new Fixtable(element[0], scope.options.debugMode);
          ref = scope.options.columns;
          for (i = j = 0, len = ref.length; j < len; i = ++j) {
            col = ref[i];
            if (col.width) {
              fixtable.setColumnWidth(i + 1, col.width);
            }
          }
          fixtable.setDimensions();
          scope.$parent.$watchCollection(scope.options.data, function(newData) {
            scope.data = newData;
            if (!scope.options.paging) {
              filterAndSortData();
            }
            return $timeout(function() {
              fixtable.setDimensions();
              return fixtable.scrollTop();
            });
          });
          if (scope.options.reflow) {
            scope.$parent.$watch(scope.options.reflow, function(newValue) {
              if (newValue) {
                return $timeout(function() {
                  return fixtable.setDimensions();
                });
              }
            });
          }
          scope.$watch('options.pagingOptions', function(newVal, oldVal) {
            var pageChanged, pageSizeChanged;
            if (!newVal) {
              return;
            }
            newVal.currentPage = parseInt(newVal.currentPage);
            scope.totalPages = Math.ceil(newVal.totalItems / newVal.pageSize) || 1;
            scope.totalPagesOoM = (scope.totalPages + "").length;
            if (newVal.currentPage > scope.totalPages) {
              newVal.currentPage = scope.totalPages;
            }
            pageChanged = newVal.currentPage !== oldVal.currentPage;
            pageSizeChanged = newVal.pageSize !== oldVal.pageSize;
            if (newVal === oldVal || pageChanged || pageSizeChanged) {
              return getPageData();
            }
          }, true);
          if (scope.options.loading) {
            scope.$parent.$watch(scope.options.loading, function(newValue) {
              return scope.loading = newValue;
            });
          }
          getPageData = function() {
            var cb;
            cb = scope.$parent[scope.options.pagingOptions.callback];
            return cb(scope.options.pagingOptions, scope.options.sort, scope.appliedFilters);
          };
          scope.nextPage = function() {
            return scope.pagingOptions.currentPage += 1;
          };
          scope.prevPage = function() {
            return scope.pagingOptions.currentPage -= 1;
          };
          scope.parent = scope.$parent;
          scope.columnFilters = [];
          ref1 = scope.options.columns;
          for (index = k = 0, len1 = ref1.length; k < len1; index = ++k) {
            column = ref1[index];
            if (column.filter) {
              defaultValues = fixtableFilterTypes[column.filter.type].defaultValues;
              defaultFilterFn = fixtableFilterTypes[column.filter.type].filterFn;
              if ((base = column.filter).values == null) {
                base.values = angular.copy(defaultValues) || {};
              }
              scope.columnFilters.push({
                type: column.filter.type,
                property: column.property,
                values: column.filter.values,
                filterFn: column.filter.filterFn || defaultFilterFn
              });
              valuesObj = 'options.columns[' + index + '].filter.values';
              scope.$watch(valuesObj, function(newVal, oldVal) {
                var currentFilters;
                if (newVal === oldVal) {
                  return;
                }
                currentFilters = getCurrentFilterValues();
                if (angular.equals(currentFilters, scope.appliedFilters)) {
                  return scope.filtersDirty = false;
                } else {
                  scope.filtersDirty = true;
                  if (scope.options.realtimeFiltering) {
                    return scope.applyFilters();
                  }
                }
              }, true);
            }
          }
          if (!scope.options.realtimeFiltering) {
            scope.$watch('filtersDirty', function() {
              return $timeout(function() {
                return fixtable.setDimensions();
              });
            });
          }
          scope.applyFilters = function() {
            scope.appliedFilters = getCurrentFilterValues();
            scope.filtersDirty = false;
            return updateData();
          };
          getCurrentFilterValues = function() {
            var filter, l, len2, obj, ref2;
            obj = {};
            ref2 = scope.columnFilters;
            for (l = 0, len2 = ref2.length; l < len2; l++) {
              filter = ref2[l];
              obj[filter.property] = {
                type: filter.type,
                values: angular.copy(filter.values)
              };
            }
            return obj;
          };
          scope.appliedFilters = getCurrentFilterValues();
          scope.getFilterTemplate = function(filterType) {
            return fixtableFilterTypes[filterType].templateUrl;
          };
          scope.changeSort = function(property) {
            var base1, dir;
            if ((base1 = scope.options).sort == null) {
              base1.sort = {};
            }
            if (scope.options.sort.property === property) {
              dir = scope.options.sort.direction;
              scope.options.sort.direction = dir === 'asc' ? 'desc' : 'asc';
            } else {
              scope.options.sort.property = property;
              scope.options.sort.direction = 'asc';
            }
            return updateData();
          };
          getSelectedItemIndex = function(item) {
            var l, len2, ref2, ref3, selectedItem;
            if (!((ref2 = scope.selectedItems) != null ? ref2.length : void 0)) {
              return -1;
            }
            ref3 = scope.selectedItems;
            for (index = l = 0, len2 = ref3.length; l < len2; index = ++l) {
              selectedItem = ref3[index];
              if (angular.equals(item, selectedItem)) {
                return index;
              }
            }
            return -1;
          };
          scope.rowSelected = function(row) {
            return getSelectedItemIndex(row) !== -1;
          };
          scope.toggleRowSelection = function(row) {
            if (scope.rowSelected(row)) {
              scope.selectedItems.splice(getSelectedItemIndex(row), 1);
              return scope.$emit('fixtableUnselectRow', row);
            } else {
              scope.selectedItems.push(row);
              return scope.$emit('fixtableSelectRow', row);
            }
          };
          scope.pageSelected = function() {
            var l, len2, ref2, ref3, ref4, row;
            if (!(((ref2 = scope.selectedItems) != null ? ref2.length : void 0) && ((ref3 = scope.data) != null ? ref3.length : void 0))) {
              return false;
            }
            ref4 = scope.data;
            for (l = 0, len2 = ref4.length; l < len2; l++) {
              row = ref4[l];
              if (!(scope.rowSelected(row) || scope.options.rowSelectionDisabled(row))) {
                return false;
              }
            }
            return true;
          };
          scope.pagePartiallySelected = function() {
            var l, len2, ref2, ref3, ref4, row;
            if (!(((ref2 = scope.selectedItems) != null ? ref2.length : void 0) && ((ref3 = scope.data) != null ? ref3.length : void 0))) {
              return false;
            }
            if (scope.pageSelected()) {
              return false;
            }
            ref4 = scope.data;
            for (l = 0, len2 = ref4.length; l < len2; l++) {
              row = ref4[l];
              if (scope.rowSelected(row)) {
                return true;
              }
            }
            return false;
          };
          scope.togglePageSelection = function() {
            var l, len2, len3, m, ref2, ref3, row;
            if (scope.pageSelected()) {
              ref2 = scope.data;
              for (l = 0, len2 = ref2.length; l < len2; l++) {
                row = ref2[l];
                if (scope.options.rowSelectionDisabled(row)) {
                  continue;
                }
                if (scope.rowSelected(row)) {
                  scope.selectedItems.splice(getSelectedItemIndex(row), 1);
                }
              }
              return scope.$emit('fixtableUnselectAllRows');
            } else {
              ref3 = scope.data;
              for (m = 0, len3 = ref3.length; m < len3; m++) {
                row = ref3[m];
                if (scope.options.rowSelectionDisabled(row)) {
                  continue;
                }
                if (!scope.rowSelected(row)) {
                  scope.selectedItems.push(row);
                }
              }
              return scope.$emit('fixtableSelectAllRows');
            }
          };
          updateData = function() {
            if (scope.options.paging) {
              return getPageData();
            } else {
              return filterAndSortData();
            }
          };
          return filterAndSortData = function() {
            var compareFn, customCompareFn, filter, l, len2, len3, len4, m, n, o, ref2, ref3, ref4, ref5, ref6, ref7, results, testValue;
            scope.data = ((ref2 = scope.$parent[scope.options.data]) != null ? ref2.slice(0) : void 0) || [];
            if ((ref3 = scope.options.sort) != null ? ref3.property : void 0) {
              ref4 = scope.options.columns;
              for (l = 0, len2 = ref4.length; l < len2; l++) {
                col = ref4[l];
                if (col.property === scope.options.sort.property) {
                  if (col.sortCompareFunction) {
                    customCompareFn = col.sortCompareFunction;
                    break;
                  }
                }
              }
              compareFn = customCompareFn || function(a, b) {
                var aVal, bVal;
                aVal = a[scope.options.sort.property];
                bVal = b[scope.options.sort.property];
                if (aVal > bVal) {
                  return 1;
                } else if (aVal < bVal) {
                  return -1;
                } else {
                  return 0;
                }
              };
              scope.data.sort(function(a, b) {
                var compared, dir;
                dir = scope.options.sort.direction;
                compared = compareFn(a, b);
                if (dir === 'asc') {
                  return compared;
                } else {
                  return ~--compared;
                }
              });
            }
            if (scope.data.length) {
              ref6 = (function() {
                results = [];
                for (var n = 0, ref5 = scope.data.length - 1; 0 <= ref5 ? n <= ref5 : n >= ref5; 0 <= ref5 ? n++ : n--){ results.push(n); }
                return results;
              }).apply(this).reverse();
              for (m = 0, len3 = ref6.length; m < len3; m++) {
                i = ref6[m];
                ref7 = scope.columnFilters;
                for (o = 0, len4 = ref7.length; o < len4; o++) {
                  filter = ref7[o];
                  testValue = filter.property ? scope.data[i][filter.property] : scope.data[i];
                  if (!filter.filterFn(testValue, filter.values)) {
                    scope.data.splice(i, 1);
                    break;
                  }
                }
              }
            }
            return $timeout(function() {
              return fixtable.setDimensions();
            });
          };
        },
        replace: true,
        restrict: 'E',
        scope: {
          options: '='
        },
        templateUrl: 'fixtable/templates/fixtable.html'
      };
    }
  ]);

  angular.module('fixtable').directive('fixtableIndeterminateCheckbox', [
    function() {
      return {
        restrict: 'A',
        link: function(scope, element, attrs) {
          return attrs.$observe('fixtableIndeterminateCheckbox', function(newVal) {
            return element[0].indeterminate = newVal === 'true' ? true : false;
          });
        }
      };
    }
  ]);

  angular.module('fixtable').directive('fixtableInput', [
    function() {
      return {
        replace: true,
        restrict: 'E',
        templateUrl: 'fixtable/templates/fixtableInput.html',
        link: function(scope, element, attrs) {
          return element[0].focus();
        }
      };
    }
  ]);

  angular.module('fixtable').provider('fixtableDefaultOptions', function() {
    this.defaultOptions = {
      applyFiltersTemplate: 'fixtable/templates/applyFilters.html',
      cellTemplate: 'fixtable/templates/bodyCell.html',
      checkboxCellTemplate: 'fixtable/templates/checkboxCell.html',
      checkboxHeaderTemplate: 'fixtable/templates/checkboxHeaderCell.html',
      debugMode: false,
      editTemplate: 'fixtable/templates/editCell.html',
      emptyTemplate: 'fixtable/templates/emptyMessage.html',
      footerTemplate: 'fixtable/templates/footer.html',
      headerTemplate: 'fixtable/templates/headerCell.html',
      loadingTemplate: 'fixtable/templates/loading.html',
      realtimeFiltering: true,
      sortIndicatorTemplate: 'fixtable/templates/sortIndicator.html',
      rowSelection: false,
      rowSelectionColumnWidth: 40,
      rowSelectionDisabled: function(row) {
        return false;
      },
      rowSelectionWithCheckboxOnly: false,
      selectedRowClass: 'active'
    };
    this.$get = function() {
      return this.defaultOptions;
    };
    this.setDefaultOptions = function(options) {
      var option, results, value;
      results = [];
      for (option in options) {
        value = options[option];
        results.push(this.defaultOptions[option] = value);
      }
      return results;
    };
    return null;
  });

  angular.module('fixtable').provider('fixtableFilterTypes', function() {
    this.filterTypes = {};
    this.filterTypes.search = {
      defaultValues: {
        query: ''
      },
      templateUrl: 'fixtable/templates/columnFilters/search.html',
      filterFn: function(testValue, filterValues) {
        var pattern;
        pattern = new RegExp(filterValues.query, 'i');
        return pattern.test(testValue);
      }
    };
    this.filterTypes.select = {
      defaultValues: {
        selected: null
      },
      templateUrl: 'fixtable/templates/columnFilters/select.html',
      filterFn: function(testValue, filterValues) {
        if (filterValues.selected == null) {
          return true;
        }
        return testValue === filterValues.selected;
      }
    };
    this.$get = function() {
      return this.filterTypes;
    };
    this.add = function(type, definition) {
      return this.filterTypes[type] = definition;
    };
    this.update = function(type, properties) {
      var property, results, value;
      results = [];
      for (property in properties) {
        value = properties[property];
        results.push(this.filterTypes[type][property] = value);
      }
      return results;
    };
    return null;
  });

}).call(this);

//# sourceMappingURL=fixtable-angular.js.map
