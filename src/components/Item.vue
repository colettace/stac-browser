<template>
  <b-card no-body class="item-card" :class="{queued: !data, deprecated: isDeprecated, description: hasDescription}" v-b-visible.400="load">
    <b-card-img-lazy v-if="hasImage" class="thumbnail" offset="200" v-bind="thumbnail" />
    <b-card-body>
      <b-card-title>
        <StacLink :data="[data, item]" class="stretched-link" />
      </b-card-title>
      <b-card-text v-if="fileFormats.length > 0 || hasDescription || isDeprecated" class="intro">
        <b-badge v-if="isDeprecated" variant="warning" class="mr-1 mt-1 deprecated">{{ $t('deprecated') }}</b-badge>
        <b-badge v-for="format in fileFormats" :key="format" variant="secondary" class="mr-1 mt-1 fileformat">{{ format | formatMediaType }}</b-badge>
        <template v-if="hasDescription">{{ data.properties.description | summarize }}</template>
      </b-card-text>
      <Keywords v-if="showKeywordsInItemCards && keywords.length > 0" :keywords="keywords" variant="primary" center />
      <b-card-text>
        <small class="text-muted">
          <template v-if="extent">{{ extent | formatTemporalExtent }}</template>
          <template v-else-if="data && data.properties.datetime">{{ data.properties.datetime | formatTimestamp }}</template>
          <template v-else>{{ $t('items.noTime') }}</template>
        </small>
      </b-card-text>
    </b-card-body>
    <template #footer>
      <p>
        <b-button-group class="float-left">
          <b-button size="sm" variant="outline-primary">
            <!--
            <b-icon-check v-if="addedToCart" />
            <b-icon-square v-else />
            -->
            <b-icon-square />
            Select
          </b-button>
          <b-dropdown size="sm" variant="outline-primary" text="Begin Workflow">
            <b-dropdown-group id="jupyter-dropdown-group" header="Provision notebook environment in your cloud">
              <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/01_3DEP_Generate_DEM_User_AOI.ipynb" target="_blank">Generate DEM </b-dropdown-item>
              <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/05_3DEP_Generate_Canopy_Height_Models_User_AOI.ipynb" target="_blank">Generate Canopy Height Model</b-dropdown-item>
              <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/06_3DEP_Topographic_Differencing.ipynb" target="_blank">Perform Topographic Differencing</b-dropdown-item>
              <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/07_3DEP_Generate_Colorized_PointClouds.ipynb" target="_blank">Generate Colorized Point Clouds</b-dropdown-item>
            </b-dropdown-group>
            <b-dropdown-divider></b-dropdown-divider>
            <b-dropdown-item href="#" disabled>Open in Databricks</b-dropdown-item>
            <b-dropdown-item href="#" disabled>Open in Snowflake</b-dropdown-item>
            <b-dropdown-item href="#" disabled>Open in Google Colab</b-dropdown-item>
          </b-dropdown>
        </b-button-group>
      </p>
    </template>
  </b-card>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import ThumbnailCardMixin from './ThumbnailCardMixin';
import StacLink from './StacLink.vue';
import STAC from '../models/stac';
import { formatTemporalExtent, formatTimestamp, formatMediaType } from '@radiantearth/stac-fields/formatters';
import Registry from '@radiantearth/stac-fields/registry';
import Utils from '../utils';
import { BDropdown, BDropdownItem, BDropdownGroup, BDropdownDivider } from 'bootstrap-vue';

Registry.addDependency('content-type', require('content-type'));

export default {
  name: 'Item',
  components: {
    StacLink,
    BDropdown,
    BDropdownItem,
    BDropdownGroup,
    BDropdownDivider,
    Keywords: () => import('./Keywords.vue')
  },
  filters: {
    summarize: text => Utils.summarizeMd(text, 150),
    formatMediaType: value => formatMediaType(value, null, {shorten: true}),
    formatTemporalExtent,
    formatTimestamp
  },
  mixins: [
    ThumbnailCardMixin
  ],
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState(['showKeywordsInItemCards']),
    ...mapGetters(['getStac']),
    data() {
      return this.getStac(this.item);
    },
    extent() {
      if (this.data && (this.data.properties.start_datetime || this.data.properties.end_datetime)) {
        return [this.data.properties.start_datetime, this.data.properties.end_datetime];
      }
      return null;
    },
    fileFormats() {
      if (this.data) {
        return this.data.getFileFormats();
      }
      return [];
    },
    keywords() {
      if (this.data) {
        return this.data.getMetadata('keywords') || [];
      }
      return [];
    },
    isDeprecated() {
      return this.data instanceof STAC && Boolean(this.data.properties.deprecated);
    },
    hasDescription() {
      return this.data instanceof STAC && Utils.hasText(this.data.properties.description);
    }
  },
  methods: {
    load(visible) {
      if (this.item instanceof STAC) {
        return;
      }
      this.$store.commit(visible ? 'queue' : 'unqueue', this.item.href);
    }
  }
};
</script>

<style lang="scss">
#stac-browser {
  .item-card {
    text-align: center;

    &.deprecated {
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }

    &.queued {
      min-height: 200px;
    }

    .intro {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      margin-bottom: 0.5rem;
    }

    &.description {
      .intro {
        text-align: left;
        margin-bottom: 0.5rem;
      }
    }

    .badge.deprecated {
      text-transform: uppercase;
    }

    .card-img {
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 200px;
    }

    .card-body {
      text-align: center;
      position: relative;
    }
  }
}
</style>
