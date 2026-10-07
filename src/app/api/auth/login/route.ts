import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const USERS_FILE = path.join(process.cwd(), 'data/users.json');

function getUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading users.json:', e);
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const loginInput = (body.email || body.username || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!loginInput || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ Email/Tên tài khoản và Mật khẩu.' },
        { status: 400 }
      );
    }

    const users = getUsers();
    const user = users.find(
      (u) =>
        (u.email || '').toLowerCase() === loginInput ||
        (u.name || '').toLowerCase() === loginInput
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc email không tồn tại trong hệ thống.' },
        { status: 404 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Mật khẩu không chính xác. Vui lòng thử lại.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý đăng nhập' },
      { status: 500 }
    );
  }
}
