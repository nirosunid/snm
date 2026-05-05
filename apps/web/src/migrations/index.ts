import * as migration_20260505_123044_add_user_role from './20260505_123044_add_user_role';
import * as migration_20260505_150409_add_brands from './20260505_150409_add_brands';
import * as migration_20260505_155858_add_voice_samples from './20260505_155858_add_voice_samples';

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
    name: '20260505_155858_add_voice_samples'
  },
];
