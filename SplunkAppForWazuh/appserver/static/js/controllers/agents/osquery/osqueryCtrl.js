/*
 * Wazuh app - Agents controller
 * Copyright (C) 2018 Wazuh, Inc.
 *
 * This program is free software you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation either version 2 of the License, or
 * (at your option) any later version.
 *
 * Find more information about this on the LICENSE file.
 */

define([
  '../../module',
  '../../../services/visualizations/chart/pie-chart',
  '../../../services/visualizations/chart/area-chart',
  '../../../services/visualizations/table/table',
  '../../../services/visualizations/inputs/time-picker'
], function(app, PieChart, AreaChart, Table, TimePicker) {
  'use strict'

  class OsqueryAgents {
    /**
     * Class constructor
     * @param {Object} $urlTokenModel
     * @param {Object} $state
     * @param {Object} $scope
     * @param {Object} $currentDataService
     * @param {Object} $notificationService
     * @param {Object} agent
     * @param {Object} osquery
     */

    constructor(
      $urlTokenModel,
      $scope,
      agent,
      $notificationService,
      $currentDataService,
      $state,
      osquery
    ) {
      this.state = $state
      this.currentDataService = $currentDataService

      if (!this.currentDataService.getCurrentAgent()) {
        this.state.go('overview')
      }

      this.scope = $scope
      this.urlTokenModel = $urlTokenModel
      this.notificationService = $notificationService
      this.scope.agent = agent.data.data
      this.osquery = osquery

      this.filters = this.currentDataService.getSerializedFilters()
      this.timePicker = new TimePicker(
        '#timePicker',
        this.urlTokenModel.handleValueChange
      )

      this.scope.osqueryWodle = null

      try {
        this.currentDataService.addFilter(
          `{"rule.groups":"osquery", "implicit":true}`
        )
        this.wodles = this.osquery.data.data.wmodules
        this.scope.osqueryWodle = this.wodles.filter(
          item => item.osquery
        )[0].osquery
      } catch (err) {
        this.notificationService.showSimpleToast(
          'Cannot load wodle configuration. Osquery not configured.'
        )
      }

      this.scope.$on('deletedFilter', () => {
        this.launchSearches()
      })

      this.scope.$on('barFilter', () => {
        this.launchSearches()
      })

      this.vizz = [
        /**
         * Visualizations
         */
        new PieChart(
          'mostCommonPacks',
          `${this.filters} sourcetype=wazuh  | top data.osquery.pack limit=5`,
          'mostCommonPacks'
        ),
        new AreaChart(
          'alertsPacksOverTime',
          `${
            this.filters
          } sourcetype=wazuh | timechart span=1h count by data.osquery.pack`,
          'alertsPacksOverTime'
        ),
        new PieChart(
          'mostCommonActions',
          `${
            this.filters
          } sourcetype=wazuh  | top "data.osquery.action" limit=5`,
          'mostCommonActions'
        ),
        new Table(
          'topRules',
          `${
            this.filters
          } sourcetype=wazuh  | top rule.id, rule.description limit=5`,
          'topRules'
        ),
        new AreaChart(
          'alertsOverTime',
          `${this.filters} sourcetype=wazuh | timechart span=1h count`,
          'alertsOverTime'
        )
      ]

      /*
       * When controller is destroyed
       */
      this.scope.$on('$destroy', () => {
        this.timePicker.destroy()
        this.vizz.map(vizz => vizz.destroy())
      })
    }

    $onInit() {
      this.scope.getAgentStatusClass = agentStatus =>
        agentStatus === 'Active' ? 'teal' : 'red'
      this.scope.formatAgentStatus = agentStatus => {
        return ['Active', 'Disconnected'].includes(agentStatus)
          ? agentStatus
          : 'Never connected'
      }
    }

    launchSearches() {
      this.filters = this.currentDataService.getSerializedFilters()
      this.state.reload()
    }
  }

  app.controller('osqueryAgentCtrl', OsqueryAgents)
})
