import { createServerSupabaseClient } from '@/lib/supabase';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import type { ContenidoEducativo } from '@/types';
import { BookOpen, Video, Image } from 'lucide-react';

const iconoTipo = { articulo: BookOpen, video: Video, infografia: Image } as const;
const colorTipo: Record<string, 'green' | 'blue' | 'yellow'> = {
  articulo: 'green', video: 'blue', infografia: 'yellow',
};

export default async function EducacionPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('contenido_educativo')
    .select('*')
    .eq('publicado', true)
    .order('created_at', { ascending: false });

  if (tag) query = query.contains('tags', [tag]);

  const { data: contenido } = await query;
  const items = (contenido as ContenidoEducativo[]) ?? [];

  // Collect all tags
  const allTags = [...new Set(items.flatMap(c => c.tags ?? []))].sort();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Educación ambiental</h1>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <a href="/empresa/educacion" className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!tag ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Todos
          </a>
          {allTags.map(t => (
            <a key={t} href={`/empresa/educacion?tag=${t}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${tag === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t}
            </a>
          ))}
        </div>
      )}

      {/* Content grid */}
      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-20">Sin contenido publicado aún</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => {
            const Icon = iconoTipo[item.tipo ?? 'articulo'];
            return (
              <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardBody className="flex flex-col flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <Badge variant={colorTipo[item.tipo ?? 'articulo']}>{item.tipo}</Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{item.titulo}</h3>

                  {item.tipo === 'video' && item.url ? (
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={item.url.replace('watch?v=', 'embed/')}
                        className="w-full h-full" allowFullScreen
                      />
                    </div>
                  ) : item.contenido_md ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-4 flex-1">
                      <ReactMarkdown>{item.contenido_md}</ReactMarkdown>
                    </div>
                  ) : null}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map(t => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
