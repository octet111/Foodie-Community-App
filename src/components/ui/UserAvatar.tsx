type UserAvatarProps = {
  nickname: string;
  avatarUrl?: string | null;
  className?: string;
};

const defaultClassName =
  "h-6 w-6 text-[10px] font-bold bg-line text-txt-2";

export function UserAvatar({
  nickname,
  avatarUrl,
  className = defaultClassName,
}: UserAvatarProps) {
  const initial = nickname.charAt(0) || "?";

  return (
    <span
      className={`box-border block shrink-0 overflow-hidden rounded-full border border-line ${className}`}
      aria-hidden={avatarUrl ? true : undefined}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="block h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {initial}
        </span>
      )}
    </span>
  );
}
