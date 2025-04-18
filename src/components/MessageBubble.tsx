
import { cn } from '@/lib/utils';

type MessageType = 'user' | 'ai';

interface MessageBubbleProps {
  type: MessageType;
  content: string;
  timestamp?: Date;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  type,
  content,
  timestamp = new Date(),
}) => {
  return (
    <div className={cn(
      'flex',
      type === 'user' ? 'justify-end' : 'justify-start',
      'w-full my-2'
    )}>
      <div className={type === 'user' ? 'message-user' : 'message-ai'}>
        <p className="whitespace-pre-wrap">{content}</p>
        <div className={cn(
          'text-xs mt-1 opacity-70',
          type === 'user' ? 'text-right' : 'text-left'
        )}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
