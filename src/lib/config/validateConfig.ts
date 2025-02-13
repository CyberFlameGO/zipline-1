import { Config } from 'lib/config/Config';
import { s } from '@sapphire/shapeshift';
import { inspect } from 'util';
import Logger from '../logger';

const discord_content = s
  .object({
    content: s.string.nullish.default(null),
    embed: s
      .object({
        title: s.string.nullish.default(null),
        description: s.string.nullish.default(null),
        footer: s.string.nullish.default(null),
        color: s.number.notEqual(NaN).nullish.default(null),
        thumbnail: s.boolean.default(false),
        image: s.boolean.default(true),
        timestamp: s.boolean.default(true),
      })
      .default(null),
  })
  .default(null);

const validator = s.object({
  core: s.object({
    https: s.boolean.default(false),
    secret: s.string.lengthGreaterThanOrEqual(8),
    host: s.string.default('0.0.0.0'),
    port: s.number.default(3000),
    database_url: s.string,
    logger: s.boolean.default(false),
    stats_interval: s.number.default(1800),
    invites_interval: s.number.default(1800),
  }),
  datasource: s
    .object({
      type: s.enum('local', 's3', 'swift').default('local'),
      local: s
        .object({
          directory: s.string.default('./uploads'),
        })
        .default({
          directory: './uploads',
        }),
      s3: s.object({
        access_key_id: s.string,
        secret_access_key: s.string,
        endpoint: s.string,
        port: s.number.optional.default(undefined),
        bucket: s.string,
        force_s3_path: s.boolean.default(false),
        region: s.string.default('us-east-1'),
        use_ssl: s.boolean.default(false),
      }).optional,
      swift: s.object({
        username: s.string,
        password: s.string,
        auth_endpoint: s.string,
        container: s.string,
        project_id: s.string,
        domain_id: s.string.default('default'),
        region_id: s.string.nullable,
      }).optional,
    })
    .default({
      type: 'local',
      local: {
        directory: './uploads',
      },
      s3: {
        region: 'us-east-1',
        force_s3_path: false,
      },
      swift: {
        domain_id: 'default',
      },
    }),
  uploader: s
    .object({
      route: s.string.default('/u'),
      embed_route: s.string.default('/a'),
      length: s.number.default(6),
      admin_limit: s.number.default(104900000),
      user_limit: s.number.default(104900000),
      disabled_extensions: s.string.array.default([]),
      format_date: s.string.default('YYYY-MM-DD_HH:mm:ss'),
    })
    .default({
      route: '/u',
      embed_route: '/a',
      length: 6,
      admin_limit: 104900000,
      user_limit: 104900000,
      disabled_extensions: [],
      format_date: 'YYYY-MM-DD_HH:mm:ss',
    }),
  urls: s
    .object({
      route: s.string.default('/go'),
      length: s.number.default(6),
    })
    .default({
      route: '/go',
      length: 6,
    }),
  ratelimit: s
    .object({
      user: s.number.default(0),
      admin: s.number.default(0),
    })
    .default({
      user: 0,
      admin: 0,
    }),
  website: s
    .object({
      title: s.string.default('Zipline'),
      show_files_per_user: s.boolean.default(true),
      show_version: s.boolean.default(true),
      disable_media_preview: s.boolean.default(false),

      external_links: s
        .array(
          s.object({
            label: s.string,
            link: s.string,
          })
        )
        .default([
          { label: 'Zipline', link: 'https://github.com/diced/zipline' },
          { label: 'Documentation', link: 'https://zipline.diced.tech/' },
        ]),
    })
    .default({
      title: 'Zipline',
      show_files_per_user: true,
      show_version: true,
      disable_media_preview: false,

      external_links: [
        { label: 'Zipline', link: 'https://github.com/diced/zipline' },
        { label: 'Documentation', link: 'https://zipline.diced.tech/' },
      ],
    }),
  discord: s
    .object({
      url: s.string,
      username: s.string.default('Zipline'),
      avatar_url: s.string.default(
        'https://raw.githubusercontent.com/diced/zipline/9b60147e112ec5b70170500b85c75ea621f41d03/public/zipline.png'
      ),
      upload: discord_content,
      shorten: discord_content,
    })
    .nullish.default(null),
  oauth: s
    .object({
      github_client_id: s.string.nullable.default(null),
      github_client_secret: s.string.nullable.default(null),

      discord_client_id: s.string.nullable.default(null),
      discord_client_secret: s.string.nullable.default(null),
    })
    .nullish.default(null),
  features: s
    .object({
      invites: s.boolean.default(true),
      oauth_registration: s.boolean.default(false),
    })
    .default({ invites: true, oauth_registration: false }),
});

export default function validate(config): Config {
  try {
    const validated = validator.parse(config);
    switch (validated.datasource.type) {
      case 's3': {
        const errors = [];
        if (!validated.datasource.s3.access_key_id)
          errors.push('datasource.s3.access_key_id is a required field');
        if (!validated.datasource.s3.secret_access_key)
          errors.push('datasource.s3.secret_access_key is a required field');
        if (!validated.datasource.s3.bucket) errors.push('datasource.s3.bucket is a required field');
        if (!validated.datasource.s3.endpoint) errors.push('datasource.s3.endpoint is a required field');
        if (errors.length) throw { errors };
        break;
      }
      case 'swift': {
        const errors = [];
        if (!validated.datasource.swift.container)
          errors.push('datasource.swift.container is a required field');
        if (!validated.datasource.swift.project_id)
          errors.push('datasource.swift.project_id is a required field');
        if (!validated.datasource.swift.auth_endpoint)
          errors.push('datasource.swift.auth_endpoint is a required field');
        if (!validated.datasource.swift.password)
          errors.push('datasource.swift.password is a required field');
        if (!validated.datasource.swift.username)
          errors.push('datasource.swift.username is a required field');
        if (errors.length) throw { errors };
        break;
      }
    }

    return validated as unknown as Config;
  } catch (e) {
    if (process.env.ZIPLINE_DOCKER_BUILD) return null;

    e.stack = '';

    Logger.get('config').error('Config is invalid, see below:');
    Logger.get('config').error(inspect(e, { depth: Infinity, colors: true }));

    process.exit(1);
  }
}
