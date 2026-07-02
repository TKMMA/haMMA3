/* ============================================================
   haMMA — Hawaii Managed Marine Areas
   Copyright (c) 2026 Tyler Kueffner
   All rights reserved.

   config.js — constants & schema
   ─────────────────────────────────────────────────────────
   Everything that describes WHAT the app shows: the data
   service URL, island ordering, rules categories, and the
   field schema for the About / Sources tabs.

   This is the file to edit when the ArcGIS layer's fields
   change or a new rules category is added.
   ============================================================ */

export const SERVICE_LAYER_URL =
  'https://services.arcgis.com/HQ0xoN0EzDPBOEci/arcgis/rest/services/TKMMAFEATURECLASS2/FeatureServer/0';

export const ISLAND_DISPLAY_ORDER = [
  "Oʻahu", "Molokaʻi", "Maui", "Lānaʻi", "Kauaʻi", "Hawaiʻi Island", "Kahoʻolawe",
];

export const INITIAL_CHAIN_BOUNDS = L.latLngBounds([[18.9, -160.0], [22.35, -154.2]]);
export const PANEL_MARGIN         = 12;    // must match --panel-margin in CSS
export const TRANSITION_MS        = 360;   // must match --dur-slow in CSS (0.36s)
export const MOBILE_MQ            = window.matchMedia('(max-width: 768px)');
export const REDUCED_MOTION_MQ    = window.matchMedia('(prefers-reduced-motion: reduce)');

export const RULES_CATEGORIES = [
  {
    key: 'Gear', label: 'Gear Rules',
    fields: {
      prohibited: 'Rules_Gear_Prohibited',
      allowed:    'Rules_Gear_Allowed',
      limited:    'Rules_Gear_Limited',
    },
  },
  {
    key: 'Species', label: 'Species & Bag Limits',
    fields: {
      prohibited: 'Rules_Species_Prohibited',
      allowed:    'Rules_Species_Allowed',
      limited:    'Rules_Species_Limited',
    },
  },
  {
    key: 'Activities', label: 'Activities Rules',
    fields: {
      prohibited: 'Rules_Activities_Prohibited',
      allowed:    'Rules_Activities_Allowed',
      limited:    'Rules_Activities_Limited',
      notes:      'Rules_Activities_Notes',
    },
  },
  {
    key: 'Seasons', label: 'Seasons & Times',
    fields: {
      prohibited: 'Rules_Seasons_Prohibited',
      allowed:    'Rules_Seasons_Allowed',
      limited:    'Rules_Seasons_Limited',
    },
  },
  {
    key: 'Transit', label: 'Transit & Anchor',
    fields: {
      prohibited: 'Rules_Transit_Prohibited',
      allowed:    'Rules_Transit_Allowed',
      notes:      'Rules_Transit_Notes',
    },
  },
];

export const RULE_STATUS = {
  prohibited: { label: 'Prohibited:',         cls: 'rule-status--prohibited' },
  allowed:    { label: 'Allowed:',             cls: 'rule-status--allowed'    },
  limited:    { label: 'Allowed with limits:', cls: 'rule-status--limited'    },
  notes:      { label: 'Notes:',               cls: 'rule-status--notes'      },
};

export const FIELD_SCHEMA = {
  about: [
    { keys: ['Designation_1','Designation_2','Designation_3'], label: 'Designation', format: 'join' },
    { key: 'Island',         label: 'Island' },
    { key: 'Purpose',        label: 'Purpose'       },
    { key: 'Cultural',       label: 'Cultural Info' },
    { key: 'Fishing_Info',   label: 'Fishing Info'  },
    { key: 'Establish_Date', label: 'Date Established', format: 'date' },
    { key: 'Location',       label: 'Location' },
    { key: 'DAR_URL',        label: 'Official DAR Page', format: 'link', linkText: 'Official DAR page ›' },
  ],
  sources: [
    { key: 'HAR_Name',  urlKey: 'HAR_Link',  label: 'Admin. Rules',          format: 'doclink', linkText: 'View HAR PDF ›'        },
    { key: 'HRS_Name',  urlKey: 'HRS_Link',  label: 'State Statute',         format: 'doclink', linkText: 'View HRS document ›'   },
    { key: 'Law_Other_Name_1', urlKey: 'Law_Other_URL_1', label: 'Other Law Reference', format: 'doclink', linkText: 'View reference ›' },
    { key: 'Law_Other_Name_2', urlKey: 'Law_Other_URL_2', label: 'Other Law Reference', format: 'doclink', linkText: 'View reference ›' },
    { key: 'State_Fishing_Regs_Text', urlKey: 'State_Fishing_Regs_URL', label: 'Statewide Fishing Regs', format: 'doclink', linkText: 'View statewide regulations ›' },
    { key: 'Rules_Also_Text', urlKey: 'Rules_Also_URL', label: 'Additional Rules', format: 'doclink', linkText: 'View additional rules ›' },
    { key: 'Mgmt_Auth', label: 'Management Authority',  format: 'rules' },
    { key: 'Enf_Auth',  label: 'Enforcement Authority', format: 'rules' },
    { key: 'Penalties', label: 'Penalties',              format: 'rules' },
  ],
};
