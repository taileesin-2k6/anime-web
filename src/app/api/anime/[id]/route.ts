import { NextResponse } from 'next/server';
import { getAnimeByIdOrSlug, updateAnime, deleteAnime } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const anime = getAnimeByIdOrSlug(id);

    if (!anime) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy anime' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: anime });
  } catch (error) {
    console.error('API [id] GET error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = updateAnime(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy anime để cập nhật' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('API [id] PUT error:', error);
    return NextResponse.json({ success: false, message: 'Không thể cập nhật' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteAnime(id);

    if (!success) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy anime để xoá' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Đã xoá anime thành công' });
  } catch (error) {
    console.error('API [id] DELETE error:', error);
    return NextResponse.json({ success: false, message: 'Không thể xoá anime' }, { status: 500 });
  }
}
