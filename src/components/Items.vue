<template>
  <section class="items mb-4">
    <header>
      <h2 class="title mr-2">{{ $tc('stacItem', items.length ) }}</h2>
      <b-badge v-if="itemCount !== null" pill variant="secondary" class="mr-4">{{ itemCount }}</b-badge>
      <SortButtons v-if="!api && items.length > 1" v-model="sort" />
    </header>

    <div class="d-flex">
      <Pagination ref="topPagination" v-if="showPagination" :pagination="pagination" placement="top" @paginate="paginate" />
      <div v-if="cartNotEmpty">
        <section>
          <b-button-group class="mb-4 mt-2 ml-4">
            <b-dropdown variant="primary" :text="CartBeginWorkflowButtonLabel">
              <b-dropdown-text>
                <p>Selected data products:</p>
                <ol>
                  <li v-for="selectedStacItem in uiSelectedArray" :key="selectedStacItem.id">
                    {{ selectedStacItem.id }}
                  </li>
                </ol>
              </b-dropdown-text>
              <b-dropdown-divider />
              <b-dropdown-group id="jupyter-dropdown-group" header="Provision notebook environment in your cloud">
                <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/01_3DEP_Generate_DEM_User_AOI.ipynb" target="_blank">Generate DEM </b-dropdown-item>
                <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/05_3DEP_Generate_Canopy_Height_Models_User_AOI.ipynb" target="_blank">Generate Canopy Height Model</b-dropdown-item>
                <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/06_3DEP_Topographic_Differencing.ipynb" target="_blank">Perform Topographic Differencing</b-dropdown-item>
                <b-dropdown-item href="http://127.0.0.1:8888/lab/tree/OT_3DEP_Workflows/notebooks/07_3DEP_Generate_Colorized_PointClouds.ipynb" target="_blank">Generate Colorized Point Clouds</b-dropdown-item>
              </b-dropdown-group>
              <b-dropdown-divider />
              <b-dropdown-item href="#" disabled>Open in Databricks</b-dropdown-item>
              <b-dropdown-item href="#" disabled>Open in Snowflake</b-dropdown-item>
              <b-dropdown-item href="#" disabled>Open in Google Colab</b-dropdown-item>
            </b-dropdown>
            <b-button variant="danger" @click="clearCart">Clear cart</b-button>
          </b-button-group>
        </section>
      </div>

      <template v-if="allowFilter">
        <b-button v-if="api" v-b-toggle.itemFilter class="mb-4 mt-2" :class="{'ml-3': showPagination}" :variant="hasFilters && !filtersOpen ? 'primary' : 'outline-primary'">
          <b-icon-search />
          {{ filtersOpen ? $t('items.hideFilter') : $t('items.showFilter') }}
          <b-badge v-if="hasFilters && !filtersOpen" variant="dark">{{ filterCount }}</b-badge>
        </b-button>
        <b-collapse id="itemFilter" v-model="filtersOpen">
          <SearchFilter
            type="Items"
            :title="$t('items.filter')" :parent="stac"
            :value="apiFilters" @input="emitFilter"
          />
        </b-collapse>
      </template>
    </div>

    <div>
      <section class="list">
        <Loading v-if="loading" fill top />
        <b-card-group v-if="chunkedItems.length > 0" columns>
          <Item v-for="item in chunkedItems" :item="item" :key="item.href" />
        </b-card-group>
        <b-alert v-else :variant="hasFilters ? 'warning' : 'info'" show>
          <template v-if="hasFilters">{{ $t('search.noItemsFound') }}</template>
          <template v-else>{{ $t('items.noneAvailableForCollection') }}</template>
        </b-alert>
      </section>
    </div>

    <Pagination v-if="showPagination" :pagination="pagination" @paginate="paginate" />
    <b-button v-else-if="hasMore" @click="showMore" variant="primary" v-b-visible.300="showMore">{{ $t('showMore') }}</b-button>
  </section>
</template>

<script>
import Item from './Item.vue';
import Loading from './Loading.vue';
import Pagination from './Pagination.vue';
import Utils from '../utils';
import STAC from '../models/stac';
import { mapState, mapGetters, mapMutations } from 'vuex';
import { BCollapse, BDropdownText, BIconSearch } from "bootstrap-vue";
import { BDropdown, BDropdownItem, BDropdownGroup, BDropdownDivider } from 'bootstrap-vue';

export default {
  name: "Items",
  components: {
    BCollapse,
    BIconSearch,
    Item,
    SearchFilter: () => import('./SearchFilter.vue'),
    Loading,
    Pagination,
    SortButtons: () => import('./SortButtons.vue'),
    BDropdown,
    BDropdownItem,
    BDropdownGroup,
    BDropdownDivider,
    BDropdownText
  },
  props: {
    items: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    stac: {
      type: Object,
      required: true
    },
    api: {
      type: Boolean,
      default: false
    },
    allowFilter: {
      type: Boolean,
      default: true
    },
    showFilters: {
      type: Boolean,
      default: false
    },
    apiFilters: {
      type: Object,
      default: () => ({})
    },
    pagination: {
      type: Object,
      default: () => ({})
    },
    chunkSize: {
      type: Number,
      default: 90
    },
    count: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      shownItems: this.chunkSize,
      filtersOpen: this.showFilters,
      sort: 0
    };
  },
  computed: {
    ...mapState(['cardViewSort', 'uiLanguage']),
    itemCount() {
      if (this.count !== null) {
        return this.count;
      }
      else if (!this.api && this.items.length > 0) {
        return this.items.length;
      }
      return null;
    },
    hasMore() {
      return this.items.length > this.shownItems;
    },
    filterCount() {
      return Object.values(this.apiFilters).filter(filter => !(filter === null || Utils.size(filter) === 0)).length;
    },
    hasFilters() {
      return this.filterCount > 0;
    },
    chunkedItems() {
      let items = this.items;
      if (this.sort !== 0) {
        const collator = new Intl.Collator(this.uiLanguage);
        items = items.slice(0).sort((a,b) => collator.compare(STAC.getDisplayTitle(a), STAC.getDisplayTitle(b)));
        if (this.sort === -1) {
          items = items.reverse();
        }
      }
      if (!this.api && this.items.length > this.chunkSize) {
        return items.slice(0, this.shownItems);
      }
      else {
        return items;
      }
    },
    showPagination() {
      if (this.api) {
        if (this.hasFilters) {
          return true;
        }
        else if (this.items.length > 0) {
          // Check whether any pagination links are available
          return Object.values(this.pagination).some(link => !!link);
        }
      }
      return false;
    },
    ...mapGetters(['uiSelectedArray']),
    uiSelectedCount() {
      return this.uiSelectedArray.length;
    },
    cartNotEmpty() {
      return (this.uiSelectedCount > 0);
    },
    CartBeginWorkflowButtonLabel(){
      return "Begin Workflow with " + this.uiSelectedCount + " Items";
    }
  },
  watch: {
    showFilters() {
      this.filter = this.showFilters;
    },
    filtersOpen() {
      this.$emit('filtersShown', this.filtersOpen);
    }
  },
  created() {
    this.sort = this.cardViewSort;
  },
  mounted() {
    if (this.showFilters) {
      setTimeout(() => Utils.scrollTo(this.$el), 250);
    }
  },
  methods: {
    ...mapMutations(['clearCart']),
    emitFilter(value, reset) {
      this.$emit('filterItems', value, reset);
    },
    showMore() {
      this.shownItems += this.chunkSize;
    },
    paginate(link, placement) {
      if (placement === 'bottom' && this.$refs.topPagination) {
        Utils.scrollTo(this.$refs.topPagination.$el);
      }
      this.$emit('paginate', link);
    }
  }
};
</script>
