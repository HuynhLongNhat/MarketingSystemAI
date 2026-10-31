
import { Hint } from "@workspace/ui/components/hint";
import { Button } from "@workspace/ui/components/button";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
} from "lucide-react";

import type {
  ConversationStatus,
} from "@/lib/conversations-api";

interface ConversationStatusButtonProps {
  status: ConversationStatus;
  onClick: () => void;
  disabled?: boolean;
}

export const ConversationStatusButton = ({
  status,
  onClick,
  disabled = false,
}: ConversationStatusButtonProps) => {
  if (status === "resolved") {
    return (
      <Hint text="Chuyển về chế độ AI hỗ trợ">
        <Button
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="tertiary"
        >
          <CheckIcon />
          Đã kết thúc
        </Button>
      </Hint>
    );
  }

  if (status === "escalated") {
    return (
      <Hint text="Kết thúc hội thoại">
        <Button
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="warning"
        >
          <ArrowUpIcon />
          Nhân viên tiếp quản
        </Button>
      </Hint>
    );
  }

  return (
    <Hint text="Chuyển hội thoại cho nhân viên">
      <Button
        disabled={disabled}
        onClick={onClick}
        size="sm"
        variant="destructive"
      >
        <ArrowRightIcon />
        AI đang hỗ trợ
      </Button>
    </Hint>
  );
};
