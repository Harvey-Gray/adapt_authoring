// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
/**
 * Menu content plugin
 *
 */

var origin = require('../../../'),
    contentmanager = require('../../../lib/contentmanager'),
    rest = require('../../../lib/rest'),
    BowerPlugin = require('../bower'),
    ContentPlugin = contentmanager.ContentPlugin,
    ContentTypeError = contentmanager.errors.ContentTypeError,
    configuration = require('../../../lib/configuration'),
    usermanager = require('../../../lib/usermanager'),
    database = require('../../../lib/database'),
    helpers = require('../../../lib/helpers'),
    logger = require('../../../lib/logger'),
    defaultOptions = require('./defaults.json'),
    bower = require('bower'),
    rimraf = require('rimraf'),
    async = require('async'),
    fs = require('fs'),
    ncp = require('ncp').ncp,
    mkdirp = require('mkdirp'),
    _ = require('underscore'),
    util = require('util'),
    path = require('path');

var bowerConfig = {
  type: 'menutype',
  keywords: 'adapt-menu',
  packageType: 'menu',
  srcLocation: 'menu',
  options: defaultOptions,
  extra: [ "targetAttribute" ],
  nameList: [],
  updateLegacyContent: function (newPlugin, oldPlugin, next) {
    // Not required for menus
    return next();
  }
};

function Menu () {
  this.bowerConfig = bowerConfig;
};

util.inherits(Menu, BowerPlugin);

/**
 * implements ContentObject#getModelName
 *
 * @return {string}
 */
Menu.prototype.getModelName = function () {
  return 'menu';
};

/**
 *
 * @return {string}
 */
Menu.prototype.getPluginType = function () {
  return 'menutype';
};

/**
 * Overrides base.retrieve
 *
 * @param {object} search
 * @param {object} options
 * @param {callback} next
 */
Menu.prototype.retrieve = function (search, options, next) {
  // shuffle params
  if ('function' === typeof options) {
    next = options;
    options = {};
  }

  if (!options.populate) {
    options.populate = { '_menuType': ['displayName'] };
  }

  ContentPlugin.prototype.retrieve.call(this, search, options, next);
};

/**
 * retrieves an array of menutype items that have been enabled on a particular course
 *
 * @param {string} courseId
 * @param {callback} cb
 */
function getEnabledMenu(courseId, cb) {
  database.getDatabase(function (error, db) {
    if (error) {
      return cb(error);
    }

    // should we delegate this feature to the config plugin?
    db.retrieve('config', { _courseId: courseId }, function (error, results) {
      if (error) {
        return cb(error);
      }

      if (!results || 0 === results.length) {
        logger.log('info', 'could not retrieve config for course ' + courseId);
        return cb(null, []);
      }

      // get the menu based on the _menu attribute
      // TODO - this does not need to be an array
      var enabledMenu = results[0]._menu;
      db.retrieve('menutype', { name: enabledMenu }, cb);
    });
  });
}

function contentDeletionHook(contentType, data, cb) {
  var contentData = data[0];

  if (!contentData._id) {
    return cb(null, data);
  }

  // TODO - Remove globals?
  return cb(null, data);
}

function get_type(thing){
    if(thing===null)return "[object Null]"; // special case
    return Object.prototype.toString.call(thing);
}

/**
 * hook to modify a newly created content item based on enabled menu for a course
 *
 * @param {string} contentType
 * @param {array} data
 * @param {callback} cb
 */
function contentCreationHook(contentType, data, cb) {
  // in creation, data[0] is the content
  var contentData = data[0];
  if (!contentData._courseId) {
    // cannot do anything for unknown courses
    return cb(null, data);
  }

  async.series([
    function(callback) {
      getEnabledMenu(contentData._courseId, function (error, menu) {
        if (error) {
          // permit content creation to continue, but log error
          logger.log('error', 'could not load menu: ' + error.message);
          return callback(null);
        }

        contentData.menuSettings = {};
        menu.forEach(function (menuItem) {
          if (menuItem.properties.hasOwnProperty('pluginLocations') && menuItem.properties.pluginLocations.properties[contentType]) {
            var schema = menuItem.properties.pluginLocations.properties[contentType].properties; // yeesh
            var generatedObject = helpers.schemaToObject(schema, menuItem.name, menuItem.version, contentType);
            contentData.menuSettings = _.extend(contentData.menuSettings, generatedObject);
          }
        });

        // assign back to passed args
        data[0] = contentData;
        callback(null);
      });
    }
  ],
  function(err, results) {
    if (err) {
      logger.log('error', err);
      return cb(err);
    }

    return cb(null, data);
  });
}

/**
 *  add/remove menu JSON from content
 *  only supports one menu
 *
 * @params courseId {string}
 * @params new menu {string} [menu name]
 * @params oldmenu  {string} [menu name]
 * @param {callback} cb
*/
function toggleMenu (courseId, menuId, cb) {
  if (!menuId) {
    return cb(error);
  }

  var user = usermanager.getCurrentUser();

  if (user && user.tenant && user.tenant._id) {
    // Changes to extensions warrants a full course rebuild
    app.emit('rebuildCourse', user.tenant._id, courseId);
  }

  database.getDatabase(function (err, db) {
    if (err) {
      return cb(err);
    }
    // TODO rename componentType variable it's confusing
    // componentType is the DB collection not a framework component
    var updateComponentItems = function (tenantDb, componentType, schema, menuItem, nextComponent) {
      var criteria = 'course' == componentType ? { _id : courseId } : { _courseId : courseId };

      tenantDb.retrieve(componentType, criteria, { fields: '_id menuSettings' }, function (err, results) {
        if (err) {
          return cb(err);
        }

        var generatedObject = helpers.schemaToObject(schema, menuItem.name, menuItem.version, componentType);
        var targetAttribute = menuItem.targetAttribute;
        // iterate components and update menuSettings attribute
        async.each(results, function (component, next) {
          var isConfig = ('config' == componentType);
          var updatedMenu = component.menuSettings || {};

          // remove the existing menuSettings
          for (var oldProps in updatedMenu) {
            if (updatedMenu.hasOwnProperty(oldProps)) {
              delete updatedMenu[oldProps];
            }
          }

          // populate new schema
          updatedMenu = _.extend(updatedMenu, generatedObject);
          // update using delta
          var delta = { menuSettings : updatedMenu };

          tenantDb.update(componentType, { _id: component._id }, delta, next);
        }, nextComponent);
      });
    };

    db.retrieve('menutype', { _id: menuId }, function (err, results) {
      if (err) {
        return cb(err);
      }

      // Switch to the tenant database
      database.getDatabase(function(err, tenantDb) {
        if (err) {
          logger.log('error', err);
          return cb(err);
        }

        // Iterate over the menu, probably only be one
        async.eachSeries(results, function (menuItem, nextItem) {
          var locations = menuItem.properties.pluginLocations.properties;

          // Ensure that the 'config' key always exists, as this is required
          // to presist the list of enabled extensions.
          if (!_.has(locations, 'config')) {
            locations.config = {};
          }

          if (menuItem.globals) {
            tenantDb.retrieve('course', {_id: courseId}, function (err, results) {
              if (err) {
                return cb(err);
              }

              var courseDoc = results[0]._doc;
              var key = '_' + menuItem.menu;
              // Extract the global defaults
              var courseGlobals = courseDoc._globals
                ? courseDoc._globals
                : {};

              // Add default value and
              if (!courseGlobals._menu) {
                courseGlobals._menu = {};
              } else {
                // remove the existing menu globals
                for (var menuProps in courseGlobals._menu) {
                  if (courseGlobals._menu.hasOwnProperty(menuProps)) {
                    delete courseGlobals._menu[menuProps];
                  }
                }
              }

              if (!courseGlobals._menu[key]) {
                // The global JSON does not exist for this menu so set the defaults
                var menuGlobals = {};

                for (var prop in menuItem.globals) {
                  if (menuItem.globals.hasOwnProperty(prop)) {
                    menuGlobals[prop] = menuItem.globals[prop].default;
                  }
                }
                courseGlobals._menu[key] = menuGlobals;
              }

              tenantDb.update('course', {_id: courseId}, {_globals: courseGlobals}, function(err, doc) {
                if (!err) {
                  async.eachSeries(Object.keys(locations), function (key, nextLocation) {
                    updateComponentItems(tenantDb, key, locations[key].properties, menuItem, nextLocation);
                  }, nextItem);
                }
              });
            });
          } else {
            async.eachSeries(Object.keys(locations), function (key, nextLocation) {
              updateComponentItems(tenantDb, key, locations[key].properties, menuItem, nextLocation);
            }, nextItem);
          }
        }, function(err) {
          if (err) {
            cb(err);
          } else {
            // The results array should only ever contain one item now, but using a FOR loop just in case.
            for (var i = 0; i < results.length; i++) {
              // Trigger an event to indicate that the menu has been enabled/disabled.
            //  app.emit(`menu:${action}`, results[0].name, user.tenant._id, courseId, user._id);
            }

            cb();
          }
        });
      });
    });
  }, configuration.getConfig('dbName'));
}

// TODO - add other content types, currently only supports course and contentObject
// add content creation hooks for each viable content type, can add more
['course', 'contentobject'].forEach(function (contentType) {
  app.contentmanager.addContentHook('create', contentType, contentCreationHook.bind(null, contentType));
});

/**
 * essential setup
 *
 * @api private
 */
function initialize () {
BowerPlugin.prototype.initialize.call(new Menu(), bowerConfig);

  var app = origin();
  app.once('serverStarted', function (server) {

    // enable a menu
    // expects course ID and a menu ID
    rest.post('/menu/:menuid/makeitso/:courseid', function (req, res, next) {
      var menuId = req.params.menuid;
      var courseId = req.params.courseid;

      // add selected menu to course config
      database.getDatabase(function (err, db) {
        if (err) {
          return next(err);
        }

        database.getDatabase(function(err, masterDb) {
          if (err) {
            return next(err);
          }

          // verify it's a valid menu
          masterDb.retrieve('menutype', { _id: menuId }, function (err, results) {
            if (err) {
              return next(err);
            }

            if (!results || 1 !== results.length) {
              res.statusCode = 404;
              return res.json({ success: false, message: 'menu not found' });
            }

            // update the course config object
            db.update('config', { _courseId: courseId }, { _menu: results[0].name }, function (err) {
              if (err) {
                return next(err);
              }
              // TODO - should check if they are just re-saving the same menu, in which case we do not want to toggle menu just rebuild.
              // otherwise this will overwrite their data.
              toggleMenu(courseId, menuId, function(error, result) {
                if (error) {
                  res.statusCode = error instanceof ContentTypeError ? 400 : 500;
                  return res.json({ success: false, message: error.message });
                }
              });

              res.statusCode = 200;
              return res.json({success: true});
            });
          });
        }, configuration.getConfig('dbName'));
      });
    });
  });
};

initialize();

/**
 * Module exports
 *
 */

exports = module.exports = Menu;
