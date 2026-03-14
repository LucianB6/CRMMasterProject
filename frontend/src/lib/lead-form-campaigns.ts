export type CampaignChannel = 'META' | 'GOOGLE' | 'ORGANIC' | 'OTHER' | 'FORM';

export type CampaignPreset = {
  id: string;
  name: string;
  channel: CampaignChannel;
  campaignCode: string;
  utmSource: string;
  utmMedium: string;
  isActive: boolean;
};

export const CHANNEL_DEFAULTS: Record<
  CampaignChannel,
  { utmSource: string; utmMedium: string }
> = {
  META: { utmSource: 'facebook', utmMedium: 'paid_social' },
  GOOGLE: { utmSource: 'google', utmMedium: 'cpc' },
  ORGANIC: { utmSource: 'organic', utmMedium: 'organic' },
  OTHER: { utmSource: 'other', utmMedium: 'referral' },
  FORM: { utmSource: 'form', utmMedium: 'owned' },
};

export const slugify = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

export const createCampaignPreset = (channel: CampaignChannel = 'META'): CampaignPreset => ({
  id:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name:
    channel === 'META'
      ? 'Meta campaign'
      : channel === 'GOOGLE'
        ? 'Google campaign'
        : 'New campaign',
  channel,
  campaignCode: '',
  utmSource: CHANNEL_DEFAULTS[channel].utmSource,
  utmMedium: CHANNEL_DEFAULTS[channel].utmMedium,
  isActive: true,
});

export const getCampaignStorageKey = (formId: string) => {
  return `lead-form-campaign-presets:${formId}`;
};

export const getDefaultCampaignPresets = () => {
  return [createCampaignPreset('META'), createCampaignPreset('GOOGLE')];
};

export const loadCampaignPresets = (formId: string) => {
  if (typeof window === 'undefined') return getDefaultCampaignPresets();

  const stored = window.localStorage.getItem(getCampaignStorageKey(formId));
  if (!stored) return getDefaultCampaignPresets();

  try {
    const parsed = JSON.parse(stored) as CampaignPreset[];
    return Array.isArray(parsed) ? parsed : getDefaultCampaignPresets();
  } catch {
    return getDefaultCampaignPresets();
  }
};

export const saveCampaignPresets = (formId: string, presets: CampaignPreset[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getCampaignStorageKey(formId), JSON.stringify(presets));
};

export const buildCampaignLink = (publicUrl: string, preset: CampaignPreset) => {
  if (!publicUrl) return '';

  const url = new URL(publicUrl);
  url.searchParams.set('source', preset.channel);
  url.searchParams.set('campaign', preset.campaignCode || preset.name);
  url.searchParams.set(
    'utm_source',
    preset.utmSource || CHANNEL_DEFAULTS[preset.channel].utmSource
  );
  url.searchParams.set(
    'utm_campaign',
    preset.campaignCode || slugify(preset.name) || preset.name
  );
  url.searchParams.set(
    'utm_medium',
    preset.utmMedium || CHANNEL_DEFAULTS[preset.channel].utmMedium
  );
  return url.toString();
};
