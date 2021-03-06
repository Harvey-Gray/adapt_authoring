// LICENCE https://github.com/adaptlearning/adapt_authoring/blob/master/LICENSE
define(function(require) {
  var Origin = require('core/origin');
  var TenantManagementView = require('./views/tenantManagementView');
  var TenantManagementSidebarView = require('./views/tenantManagementSidebarView');
  var AddTenantView = require('./views/addTenantView');
  var AddTenantSidebarView = require('./views/addTenantSidebarView');

  var isReady = true;
  var data = {
    featurePermissions: ["*/*:create", "*/*:read", "*/*:update", "*/*:delete"],
    allRoles: new Backbone.Collection(),
    allTenants: new Backbone.Collection()
  };

  Origin.on('origin:dataReady login:changed', function() {
    Origin.permissions.addRoute('tenantManagement', data.featurePermissions);
    if(Origin.permissions.hasPermissions('tenantManagement')){
      data.allTenants.on('sync', onDataFetched);
      data.allTenants.url = 'api/tenant';
      data.allTenants.fetch();
    }
  });

  Origin.on('globalMenu:tenantManagement:open', function() {
    Origin.router.navigate('#/tenantManagement', { trigger: true });
  });

  Origin.on('router:tenantManagement', function(location, subLocation, action) {
    if (!Origin.permissions.hasPermissions(data.featurePermissions)) {
      Origin.Notify.alert({
        type: 'warning',
        title: Origin.l10n.t('app.notauthorisedtitle'),
        text: Origin.l10n.t('app.notauthorisedmessage')
      });
      Origin.router.navigate('#/dashboard');
      return;
    }

    if (isReady) {
      onRoute(location, subLocation, action);
    } else {
      Origin.on('tenantManagement:dataReady', function() {
        onRoute(location, subLocation, action);
      });
    }
  });

  var onRoute = function(location, subLocation, action) {
    var mainView, sidebarView;

    if (!location) {
      mainView = TenantManagementView;
      sidebarView = TenantManagementSidebarView;
    } else if ('addTenant' === location) {
      mainView = AddTenantView;
      sidebarView = AddTenantSidebarView;
    }

    Origin.contentPane.setView(mainView, { model: new Backbone.Model({ globalData: data }) });
    Origin.sidebar.addView(new sidebarView().$el);
  };

  var onDataFetched = function() {

    if (data.allTenants.length > 0) {
      var tenantId = Origin.sessionModel.get('tenantId');

      window.model = data.allTenants.where({_id:tenantId});

      if (Origin.permissions.hasPermissions(data.featurePermissions) && model.length > 0 && model[0].get('isMaster') == true) {

        var globalMenuObject = {
          "location": "global",
          "text":  Origin.l10n.t('app.tenantmanagement'),
          "icon": "fa-users",
          "callbackEvent": "tenantManagement:open",
          "sortOrder": 5
        };
        Origin.globalMenu.addItem(globalMenuObject);
      }
    }

    isReady = true;
    Origin.trigger('tenantManagement:dataReady');
  };
});
