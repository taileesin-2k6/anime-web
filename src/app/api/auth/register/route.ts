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

function saveUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing users.json:', e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ tên, email và mật khẩu.' },
        { status: 400 }
      );
    }

    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Địa chỉ email không đúng định dạng.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có tối thiểu 6 ký tự.' },
        { status: 400 }
      );
    }

    const users = getUsers();

    // Enforce 1 account per Gmail/email strictly
    const existingUser = users.find((u) => (u.email || '').toLowerCase() === email);
    if (existingUser) {
      return NextResponse.json(
        {
          error:
            'Email này đã được đăng ký tài khoản! Mỗi địa chỉ Gmail chỉ có thể tạo 1 tài khoản trên AniStore. Vui lòng chuyển sang Đăng Nhập.',
        },
        { status: 400 }
      );
    }

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý đăng ký' },
      { status: 500 }
    );
  }
}
