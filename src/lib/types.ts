export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  videoUrl: string; // Google Drive link, embed link, or direct mp4
  gdriveId?: string;
  duration?: string;
  createdAt: string;
}

export interface Anime {
  id: string;
  title: string;
  originalTitle?: string;
  slug: string;
  poster: string;
  banner?: string;
  description: string;
  genres: string[];
  status: 'Đang chiếu' | 'Hoàn thành' | 'Sắp chiếu';
  year: number;
  totalEpisodes: string | number; // e.g. "12", "24", "??", "Tập 12/24"
  quality?: string; // e.g. "FHD 1080p", "4K"
  season?: string;
  episodes: Episode[];
  views?: number;
  createdAt: string;
  updatedAt: string;
}
