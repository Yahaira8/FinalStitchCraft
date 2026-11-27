import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, Heart, MessageCircle, Send, Trash2, X } from 'lucide-react';
import { CommunityPost, Pattern, UserProject } from '../types';
import { storageAdapter } from '../lib/storageAdapter';
import { compressImageToDataUrl } from '../lib/imageCompressor';
import { useAuth } from '../context/AuthContext';
import { PatternThumbnail } from '../components/PatternThumbnail';
import { DemoAuthPromptModal } from '../components/DemoAuthPromptModal';

export function CommunityGalleryPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPatternId, setFilterPatternId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Create Post Form
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [compressing, setCompressing] = useState(false);
  const [postPatternChoice, setPostPatternChoice] = useState<string>('');
  const [customPatternName, setCustomPatternName] = useState<string>('');
  const [yarnUsed, setYarnUsed] = useState<string>('Worsted (#4)');
  const [hookUsed, setHookUsed] = useState<string>('3.5mm');
  const [caption, setCaption] = useState<string>('');
  const [postError, setPostError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Comments Drawer & Input State
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    storageAdapter
      .getPatterns()
      .then((list) => {
        setPatterns(list);
        if (list.length > 0 && !postPatternChoice) {
          setPostPatternChoice(list[0].id);
        }
      })
      .catch(() => {});
  }, [postPatternChoice]);

  useEffect(() => {
    const state = location.state as { shareFromProject?: UserProject } | null;
    if (state?.shareFromProject) {
      const proj = state.shareFromProject;
      if (proj.pattern_id) {
        setPostPatternChoice(proj.pattern_id);
        setCustomPatternName('');
      } else {
        setPostPatternChoice('custom');
        setCustomPatternName(proj.project_name);
      }
      setYarnUsed(proj.target_yarn);
      setHookUsed(proj.target_hook);
      setCaption(`Finished my ${proj.project_name}!`);
      setCreateOpen(true);
    }
  }, [location.state]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    storageAdapter
      .getGalleryPosts({ patternId: filterPatternId, sort: sortBy })
      .then((list) => {
        if (active) setPosts(list);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filterPatternId, sortBy, user]);

  const handleOpenCreateModal = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setPostError(null);
    setCreateOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostError(null);
    setCompressing(true);
    try {
      const compressed = await compressImageToDataUrl(file, 800, 0.8);
      setPhotoDataUrl(compressed);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Unable to process image.');
    } finally {
      setCompressing(false);
    }
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);

    if (!photoDataUrl) {
      setPostError('Please upload a photo of your finished plushie.');
      return;
    }
    if (!caption.trim()) {
      setPostError('Please add a short caption about your make.');
      return;
    }
    if (postPatternChoice === 'custom' && !customPatternName.trim()) {
      setPostError('Please enter the custom pattern name.');
      return;
    }

    setPublishing(true);
    try {
      const created = await storageAdapter.createGalleryPost({
        pattern_id: postPatternChoice === 'custom' ? null : postPatternChoice || null,
        custom_pattern_name:
          postPatternChoice === 'custom' ? customPatternName.trim() : null,
        photo_data_url: photoDataUrl,
        caption: caption.trim(),
        yarn_used: yarnUsed.trim() || 'Worsted (#4)',
        hook_used: hookUsed.trim() || '3.5mm',
      });
      setPosts((prev) => [created, ...prev]);
      setCreateOpen(false);
      setPhotoDataUrl('');
      setCaption('');
      setCustomPatternName('');
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Failed to publish post.');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const res = await storageAdapter.togglePostLike(postId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: res.liked, like_count: res.like_count }
          : p
      )
    );
  };

  const handleDeletePost = async (postId: string) => {
    await storageAdapter.deleteGalleryPost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleAddComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;

    const added = await storageAdapter.addPostComment(postId, text);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, added] } : p
      )
    );
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    await storageAdapter.deletePostComment(postId, commentId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      )
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Community Showcase Gallery
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Show off finished plushies, share your yarn & hook pairings, and swap stitch tips with fellow makers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-xs font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Camera className="h-4 w-4" />
          <span>Share Finished Plushie</span>
        </button>
      </header>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <label htmlFor="gallery-pattern-filter" className="text-xs font-semibold text-[var(--text-muted)]">
            Pattern:
          </label>
          <select
            id="gallery-pattern-filter"
            value={filterPatternId}
            onChange={(e) => setFilterPatternId(e.target.value)}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
          >
            <option value="all">All Patterns</option>
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
            <option value="custom">Custom / Other Patterns</option>
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-1 w-fit">
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              sortBy === 'newest'
                ? 'bg-[var(--color-accent)] text-white dark:text-[#1A1D20]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Newest
          </button>
          <button
            type="button"
            onClick={() => setSortBy('popular')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              sortBy === 'popular'
                ? 'bg-[var(--color-accent)] text-white dark:text-[#1A1D20]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Most Liked
          </button>
        </div>
      </div>

      {/* Social Feed Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-96 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] animate-pulse"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            No plushie posts match this filter yet
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Be the first to share a finished creature for this pattern!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
          {posts.map((post) => {
            const commentsOpen = Boolean(openComments[post.id]);
            const isAuthor = Boolean(user && user.id === post.user_id);
            const dateLabel = new Date(post.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <article
                key={post.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]"
              >
                {/* Author Header */}
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-xs font-bold text-white dark:text-[#1A1D20]">
                      {post.username.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {post.username}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">{dateLabel}</p>
                    </div>
                  </div>
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      aria-label="Delete showcase post"
                      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Plushie Photo */}
                <div className="aspect-4/3 w-full overflow-hidden bg-[var(--bg-primary)]">
                  <PatternThumbnail
                    src={post.photo_data_url}
                    alt={post.pattern_title || post.custom_pattern_name || 'Finished plushie'}
                  />
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div className="text-xs text-[var(--text-muted)]">
                    {post.pattern_id && post.pattern_title ? (
                      <Link
                        to={`/patterns/${post.pattern_id}`}
                        className="font-semibold text-[var(--color-accent)] hover:underline"
                      >
                        {post.pattern_title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--text-primary)]">
                        {post.custom_pattern_name || 'Custom Pattern'}
                      </span>
                    )}
                    <span aria-hidden="true"> · </span>
                    <span>{post.yarn_used}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="tabular-nums">{post.hook_used}</span>
                  </div>

                  <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                    {post.caption}
                  </p>

                  {/* Likes & Comments Toggle */}
                  <div className="flex items-center gap-4 pt-2 border-t border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        post.liked_by_me
                          ? 'text-[var(--color-accent)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.liked_by_me ? 'fill-current' : ''}`} />
                      <span className="tabular-nums">{post.like_count}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenComments((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="tabular-nums">{post.comments.length} Comments</span>
                    </button>
                  </div>

                  {/* Comments Thread */}
                  {commentsOpen && (
                    <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                      {post.comments.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">
                          No comments yet. Share a compliment or tip!
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {post.comments.map((comment) => (
                            <li
                              key={comment.id}
                              className="flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-primary)] px-3 py-2 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {comment.username}
                                </span>{' '}
                                <span className="text-[var(--text-muted)]">{comment.body}</span>
                              </div>
                              {user && user.id === comment.user_id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  aria-label="Delete comment"
                                  className="text-[var(--text-muted)] hover:text-red-600 shrink-0 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      <form
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          maxLength={500}
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder={
                            user ? 'Add a comment...' : 'Sign in to leave a comment...'
                          }
                          className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                        />
                        <button
                          type="submit"
                          aria-label="Post comment"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white dark:text-[#1A1D20] cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Post Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-post-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 id="create-post-title" className="font-display text-xl font-bold text-[var(--text-primary)]">
                Share a Finished Plushie
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {postError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
                {postError}
              </div>
            )}

            <form onSubmit={handlePublishPost} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Plushie Photo (Compressed locally via Canvas)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-1.5 block w-full text-xs text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--border-color)] file:bg-[var(--bg-primary)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--text-primary)]"
                />
                {compressing && (
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">Compressing photo...</p>
                )}
                {photoDataUrl && (
                  <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border-color)]">
                    <img
                      src={photoDataUrl}
                      alt="Uploaded plushie preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Pattern Used
                </label>
                <select
                  value={postPatternChoice}
                  onChange={(e) => setPostPatternChoice(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  {patterns.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                  <option value="custom">Custom / Other Pattern</option>
                </select>
              </div>

              {postPatternChoice === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Custom Pattern Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={customPatternName}
                    onChange={(e) => setCustomPatternName(e.target.value)}
                    placeholder="e.g., My Cozy Capybara"
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Yarn Used
                  </label>
                  <input
                    type="text"
                    value={yarnUsed}
                    onChange={(e) => setYarnUsed(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Hook Used
                  </label>
                  <input
                    type="text"
                    value={hookUsed}
                    onChange={(e) => setHookUsed(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Caption & Maker Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share yarn colorways, washer type, or assembly tips..."
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing || compressing}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white dark:text-[#1A1D20] hover:bg-[var(--color-accent-hover)] disabled:opacity-60 cursor-pointer"
                >
                  {publishing ? 'Publishing...' : 'Publish to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DemoAuthPromptModal
        open={showAuthModal}
        title="Sign in to join the showcase"
        message="Use 1-Click Demo Crafter mode or sign in to upload plushie photos, heart posts, and leave comments."
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
