<script lang="ts">
  import type { Writable } from "svelte/store";

  import type { Granularity, PeriodicConfig } from "src/types";
  import { displayConfigs } from "src/commands";

  import SettingItem from "./SettingItem.svelte";

  export let config: Writable<PeriodicConfig>;
  export let granularity: Granularity;

  let value = $config.weeksInAdvance ?? 0;

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const num = parseInt(target.value, 10);
    if (!isNaN(num) && num >= 0) {
      value = num;
      $config.weeksInAdvance = num;
    }
  }
</script>

<SettingItem
  name="Weeks in advance"
  description={`Number of future ${displayConfigs[granularity].periodicity} notes to generate`}
  type="toggle"
  isHeading={false}
>
  <input
    slot="control"
    type="number"
    min="0"
    max="52"
    bind:value
    on:change={handleChange}
    style="width: 80px;"
  />
</SettingItem>
