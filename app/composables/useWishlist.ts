export function useWishlist() {
  const likedIds = useState<string[]>('sewain-wishlist', () => [])

  const isLiked = (id: string) => likedIds.value.includes(id)

  const toggleLike = (id: string) => {
    if (likedIds.value.includes(id)) {
      likedIds.value = likedIds.value.filter(item => item !== id)
    }
    else {
      likedIds.value.push(id)
    }
  }

  const count = computed(() => likedIds.value.length)

  return {
    likedIds,
    isLiked,
    toggleLike,
    count,
  }
}
