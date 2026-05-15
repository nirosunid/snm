import * as migration_20260505_123044_add_user_role from './20260505_123044_add_user_role';
import * as migration_20260505_150409_add_brands from './20260505_150409_add_brands';
import * as migration_20260505_155858_add_voice_samples from './20260505_155858_add_voice_samples';
import * as migration_20260505_204619_add_assets from './20260505_204619_add_assets';
import * as migration_20260506_044250_add_templates from './20260506_044250_add_templates';
import * as migration_20260506_072122_add_content_jobs from './20260506_072122_add_content_jobs';
import * as migration_20260511_083852_add_review_to_content_jobs from './20260511_083852_add_review_to_content_jobs';
import * as migration_20260512_134747_add_accounts from './20260512_134747_add_accounts';
import * as migration_20260515_065343_add_publish_to_content_jobs from './20260515_065343_add_publish_to_content_jobs';
import * as migration_20260515_081351_add_subscriptions from './20260515_081351_add_subscriptions';
import * as migration_20260515_114712_add_feedback from './20260515_114712_add_feedback';

export const migrations = [
  {
    up: migration_20260505_123044_add_user_role.up,
    down: migration_20260505_123044_add_user_role.down,
    name: '20260505_123044_add_user_role',
  },
  {
    up: migration_20260505_150409_add_brands.up,
    down: migration_20260505_150409_add_brands.down,
    name: '20260505_150409_add_brands',
  },
  {
    up: migration_20260505_155858_add_voice_samples.up,
    down: migration_20260505_155858_add_voice_samples.down,
    name: '20260505_155858_add_voice_samples',
  },
  {
    up: migration_20260505_204619_add_assets.up,
    down: migration_20260505_204619_add_assets.down,
    name: '20260505_204619_add_assets',
  },
  {
    up: migration_20260506_044250_add_templates.up,
    down: migration_20260506_044250_add_templates.down,
    name: '20260506_044250_add_templates',
  },
  {
    up: migration_20260506_072122_add_content_jobs.up,
    down: migration_20260506_072122_add_content_jobs.down,
    name: '20260506_072122_add_content_jobs',
  },
  {
    up: migration_20260511_083852_add_review_to_content_jobs.up,
    down: migration_20260511_083852_add_review_to_content_jobs.down,
    name: '20260511_083852_add_review_to_content_jobs',
  },
  {
    up: migration_20260512_134747_add_accounts.up,
    down: migration_20260512_134747_add_accounts.down,
    name: '20260512_134747_add_accounts',
  },
  {
    up: migration_20260515_065343_add_publish_to_content_jobs.up,
    down: migration_20260515_065343_add_publish_to_content_jobs.down,
    name: '20260515_065343_add_publish_to_content_jobs',
  },
  {
    up: migration_20260515_081351_add_subscriptions.up,
    down: migration_20260515_081351_add_subscriptions.down,
    name: '20260515_081351_add_subscriptions',
  },
  {
    up: migration_20260515_114712_add_feedback.up,
    down: migration_20260515_114712_add_feedback.down,
    name: '20260515_114712_add_feedback'
  },
];
