import * as migration_20260505_123044_add_user_role from './20260505_123044_add_user_role';
import * as migration_20260505_150409_add_brands from './20260505_150409_add_brands';
import * as migration_20260505_155858_add_voice_samples from './20260505_155858_add_voice_samples';
import * as migration_20260505_204619_add_assets from './20260505_204619_add_assets';
import * as migration_20260506_044250_add_templates from './20260506_044250_add_templates';
import * as migration_20260506_072122_add_content_jobs from './20260506_072122_add_content_jobs';

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
    name: '20260506_072122_add_content_jobs'
  },
];
