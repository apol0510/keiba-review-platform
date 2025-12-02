import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'scripts/config/site-ratings.json');

/**
 * GET: 悪質サイト一覧取得
 * POST: 悪質サイト追加
 * DELETE: 悪質サイト削除
 */

export const GET: APIRoute = async () => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const malicious = config.malicious || [];

    return new Response(JSON.stringify({ malicious }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to load malicious sites' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { siteName } = await request.json();

    if (!siteName || siteName.trim() === '') {
      return new Response(JSON.stringify({ error: 'Site name is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const malicious = config.malicious || [];

    if (malicious.includes(siteName)) {
      return new Response(JSON.stringify({ error: 'Site already exists' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    malicious.push(siteName);
    malicious.sort();
    config.malicious = malicious;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    return new Response(JSON.stringify({ success: true, malicious }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to add malicious site' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { siteName } = await request.json();

    if (!siteName || siteName.trim() === '') {
      return new Response(JSON.stringify({ error: 'Site name is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const malicious = config.malicious || [];

    const index = malicious.indexOf(siteName);
    if (index === -1) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    malicious.splice(index, 1);
    config.malicious = malicious;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    return new Response(JSON.stringify({ success: true, malicious }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to remove malicious site' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
