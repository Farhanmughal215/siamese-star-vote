-- Replace every cat's image with the artwork the cafe owner sent us.
-- UPSERT-by-slug pattern would also work, but we just need UPDATE here
-- since all 16 rows already exist.

update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2025/10/Lucy.png'              where slug = 'lucy';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/01/Charlie-Cat.webp'      where slug = 'charlie';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/04/Feli.webp'             where slug = 'feli';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2025/10/Cleo.png'              where slug = 'cleo';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2025/10/Siam.webp'             where slug = 'siam';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2025/10/Malee.webp'            where slug = 'malee';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2025/10/Mia.webp'              where slug = 'mia';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2025/10/Mia-1.webp'            where slug = 'pho';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/Mira-Cat.webp'         where slug = 'mira';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2025/10/Untitled-design-3.webp' where slug = 'comet';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/Nina.webp'             where slug = 'nina';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/01/Flow-cat.png'          where slug = 'flow';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/01/Soul-Cat.png'          where slug = 'soul';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/01/Luca-Cat.png'          where slug = 'luca';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/01/Lila-Cat.png'          where slug = 'lila';
update public.cats set image_url = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/03/Muezza-cat.png'        where slug = 'muezza';

-- Quick check
select slug, name, image_url from public.cats order by slug;
