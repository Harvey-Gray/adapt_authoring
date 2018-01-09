// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require){
    var Handlebars = require('handlebars');
    var Origin = require('core/origin');
    var moment = require('moment');

    var helpers = {
        console: function(context) {
          return console.log(context);
        },
        lowerCase: function(text) {
          return text.toLowerCase();
        },
        numbers: function(index) {
          return index +1;
        },
        capitalise:  function(text) {
          return text.charAt(0).toUpperCase() + text.slice(1);
        },
        odd: function (index) {
          return (index +1) % 2 === 0  ? 'even' : 'odd';
        },
        stringToClassName: function(text) {
          if (!text) {
            return;
          }
          // Check if first character is an underscore and remove
          // Normally used for attribute with '_'s
          if (text.slice(1) === '_') {
            text = text.slice(1);
          }
          // Remove _ and spaces with dashes
          return text.replace(/_| /g, "-").toLowerCase();
        },
        keyToTitleString: function(key) {
          if (!key) {
            return;
          }
          // remove all _'s
          var s = key.replace(/_/g, "");
          // separate camel-cased words
          var capitalIndex = s.search(/[A-Z]{1}/);
          while(capitalIndex > 0) {
            s = s.slice(0,capitalIndex) + ' ' + s.slice(capitalIndex);
            capitalIndex = s.match(/[A-Z]{1}/);
          }
          // capitalise
          return this.capitalise(s);
        },
        formatDate: function(timestamp, noZero) {
          var noDisplay = '-';
          // 2014-02-17T17:00:34.196Z
          if (typeof(timestamp) !== 'undefined') {
            var date = new Date(timestamp);

            // optionally use noDisplay char if 0 dates are to be interpreted as such
            if (noZero && 0 === date.valueOf()) {
              return noDisplay;
            }

            return date.toDateString();
          }

          return noDisplay;
        },
        momentFormat: function(date, format) {
          if (typeof date == 'undefined') {
            return '-';
          }

          return moment(date).format(format);
        },
        formatDuration: function(duration) {
          var zero = '0', hh, mm, ss;
          var time = new Date(0, 0, 0, 0, 0, Math.floor(duration), 0);

          hh = time.getHours();
          mm = time.getMinutes();
          ss = time.getSeconds();

          // Pad zero values to 00
          hh = (zero+hh).slice(-2);
          mm = (zero+mm).slice(-2);
          ss = (zero+ss).slice(-2);

          return hh + ':' + mm + ':' + ss;
        },
        // checks for http/https and www. prefix
        isAssetExternal: function(url) {
          if (url && url.length > 0) {
            var urlRegEx = new RegExp(/^(https?:\/\/)|^(www\.)/);
            return url.match(urlRegEx) !== null;
          } else {
            return true;
          }
        },
        ifValueEquals: function(value, text, block) {
            if (value === text) {
                return block.fn(this);
            } else {
                return block.inverse(this);
            }
        },
        ifUserIsMe: function(userId, block) {
          if (userId === Origin.sessionModel.get('id')) {
            return block.fn(this);
          } else {
            return block.inverse(this);
          }
        },
        selected: function(option, value){
            if (option === value) {
                return ' selected';
            } else {
                return ''
            }
        },
        counterFromZero: function(n, block) {
            var sum = '';
            for (var i = 0; i <= n; ++i)
                sum += block.fn(i);
            return sum;
        },
        counterFromOne: function(n, block) {
            var sum = '';
            for (var i = 1; i <= n; ++i)
                sum += block.fn(i);
            return sum;
        },
        t: function(str, options) {
            for (var placeholder in options.hash) {
              options[placeholder] = options.hash[placeholder];
            }
            return Origin.l10n.t(str, options);
        },
        stripHtml: function(html) {
            return new Handlebars.SafeString(html);
        },
        bytesToSize: function(bytes) {
            if (bytes == 0) return '0 B';

            var k = 1000,
             sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
             i = Math.floor(Math.log(bytes) / Math.log(k));

            return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
        },
        renderBooleanOptions: function(selectedValue) {
            var options = ["true", "false"];
            var html = '';

            for (var i = 0; i < options.length; i++) {
                var selected = selectedValue == options[i] ? ' selected' : '';
                html += '<option value="' + options[i] + '"' + selected + '>' + options[i] + '</option>';
            }

            return new Handlebars.SafeString(html);
        },
        pickCSV: function (list, key, separator) {
          var vals = [];
          separator = (separator && separator.length) ? separator : ',';
          if (list && list.length) {
            for (var i = 0; i < list.length; ++i) {
              if (key && list[i][key]) {
                vals.push(list[i][key]);
              } else {
                vals.push(list[i]);
              }
            }
          }
          return vals.join(separator);
        },
        renderTags: function(list, key) {
          var html = '';

          if (list && list.length) {
            html = '<ul class="tag-container">';

            for (var i = 0; i < list.length; ++i) {
              var tag = (key && list[i][key]) ?
                list[i][key]
                : list[i];

              html += '<li class="tag-item" title="' + tag + '"><span class="tag-value">' + tag  + '</span></li>';
            }

            html += '</ul>'
          }

          return html;
        },
        decodeHTML: function(html) {
          var el = document.createElement('div');
          el.innerHTML = html;
          return el.childNodes.length === 0 ? "" : el.childNodes[0].nodeValue;
        },

        ifHasPermissions: function(permissions, block) {
          var permissionsArray = permissions.split(',');
          if (Origin.permissions.hasPermissions(permissionsArray)) {
            return block.fn(this);
          } else {
            return block.inverse(this);
          }
        },

        ifMailEnabled: function(block) {
          if (Origin.constants.useSmtp === true) {
            return block.fn(this);
          } else {
            return block.inverse(this);
          }
        },

        ifImageIsCourseAsset: function(url, block) {
          if (url.length !== 0 && url.indexOf('course/assets') == 0) {
            return block.fn(this);
          } else {
            return block.inverse(this);
          }
        },

        ifAssetIsExternal: function(url, block) {
            if(Handlebars.helpers.isAssetExternal(url)) {
                return block.fn(this);
            } else {
                return block.inverse(this);
            }
        },

        ifAssetIsHeroImage: function(url, block) {
          var urlSplit = url.split('/')
          if (urlSplit.length === 1) {
            return block.fn(this);
          } else {
            return block.inverse(this);
          }
        },

        copyStringToClipboard: function(data) {

          var textArea = document.createElement("textarea");

          textArea.value = data;

          // Place in top-left corner of screen regardless of scroll position.
          textArea.style.position = 'fixed';
          textArea.style.top = 0;
          textArea.style.left = 0;

          // Ensure it has a small width and height. Setting to 1px / 1em
          // doesn't work as this gives a negative w/h on some browsers.
          textArea.style.width = '2em';
          textArea.style.height = '2em';

          // We don't need padding, reducing the size if it does flash render.
          textArea.style.padding = 0;

          // Clean up any borders.
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';

          // Avoid flash of white box if rendered for any reason.
          textArea.style.background = 'transparent';

          document.body.appendChild(textArea);

          textArea.select();

          var success = document.execCommand('copy');

          document.body.removeChild(textArea);

          return success;
        },

        // checks for at least one child object
        validateCourseContent: function(currentCourse, callback) {
          var containsAtLeastOneChild = true;
          var alerts = [];
          var iterateOverChildren = function(model, index, doneIterator) {
            if(!model._childTypes) {
              return doneIterator();
            }
            model.fetchChildren(function(currentChildren) {
              if (currentChildren.length > 0) {
                return helpers.forParallelAsync(currentChildren, iterateOverChildren, doneIterator);
              }
              containsAtLeastOneChild = false;
              var children = _.isArray(model._childTypes) ? model._childTypes.join('/') : model._childTypes;
              alerts.push(model.get('_type') + " '" + model.get('title') + "' missing " + children);
              doneIterator();
            });
          };
          // start recursion
          iterateOverChildren(currentCourse, null, function() {
            var errorMessage = "";
            if(alerts.length > 0)  {
              for(var i = 0, len = alerts.length; i < len; i++) {
                errorMessage += "<li>" + alerts[i] + "</li>";
              }
              return callback(new Error(errorMessage));
            }
            callback(null, true);
          });
        },

      isValidEmail: function(value) {
        var regEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (value.length === 0 || !regEx.test(value)) {
          return false;
        } else {
          return true;
        }
      },

      contentModelMap: function(type) {
        var contentModels = {
          contentobject: 'core/models/contentObjectModel',
          article: 'core/models/articleModel',
          block: 'core/models/blockModel',
          component: 'core/models/componentModel',
          courseasset: 'core/models/courseAssetModel'
        };
        if(contentModels.hasOwnProperty(type)) {
          return require(contentModels[type]);
        }
      },

      /**
      * Ensures list is iterated (doesn't guarantee order), even if using async iterator
      * @param list Array or Backbone.Collection
      * @param func Function to use as iterator. Will be passed item, index and callback function
      * @param callback Function to be called on completion
      */
      forParallelAsync: function(list, func, callback) {
        if(!list.hasOwnProperty('length') || list.length === 0) {
          if(typeof callback === 'function') callback();
          return;
        }
        // make a copy in case func modifies the original
        var listCopy = list.models ? list.models.slice() : list.slice();
        var doneCount = 0;
        var _checkCompletion = function() {
          if((++doneCount === listCopy.length) && typeof callback === 'function') {
            callback();
          }
        };
        for(var i = 0, count = listCopy.length; i < count; i++) {
          func(listCopy[i], i, _checkCompletion);
        }
      },

      /**
      * Ensures list is iterated in order, even if using async iterator
      * @param list Array or Backbone.Collection
      * @param func Function to use as iterator. Will be passed item, index and callback function
      * @param callback Function to be called on completion
      */
      forSeriesAsync: function(list, func, callback) {
        if(!list.hasOwnProperty('length') || list.length === 0) {
          if(typeof callback === 'function') callback();
          return;
        }
        // make a copy in case func modifies the original
        var listCopy = list.models ? list.models.slice() : list.slice();
        var doneCount = -1;
        var _doAsync = function() {
          if(++doneCount === listCopy.length) {
            if(typeof callback === 'function') callback();
            return;
          }
          var nextItem = listCopy[doneCount];
          if(!nextItem) {
            console.error('Invalid item at', doneCount + ':', nextItem);
          }
          func(nextItem, doneCount, _doAsync);
        };
        _doAsync();
      },

      /**
      * Does a fetch for model in models, and returns the latest data in the
      * passed callback
      * @param models {Array of Backbone.Models}
      * @param callback {Function to call when complete}
      */
      multiModelFetch: function(models, callback) {
        var collatedData = {};
        helpers.forParallelAsync(models, function(model, index, done) {
          model.fetch({
            success: function(data) {
              collatedData[index] = data;
              done();
            },
            error: function(data) {
              console.error('Failed to fetch data for', model.get('_id'), + data.responseText);
              done();
            }
          });
        }, function doneAll() {
          var orderedKeys = Object.keys(collatedData).sort();
          var returnArr = [];
          for(var i = 0, count = orderedKeys.length; i < count; i++) {
            returnArr.push(collatedData[orderedKeys[i]]);
          }
          callback(returnArr);
        });
      }
    };

    for(var name in helpers) {
       if(helpers.hasOwnProperty(name)) {
             Handlebars.registerHelper(name, helpers[name]);
        }
    }

    return helpers;
});
