from app.adapters.evaluation.anthropic_eval import AnthropicEvaluator
from app.adapters.evaluation.base import RuleEvaluator

_instance: RuleEvaluator | None = None


def get_evaluator() -> RuleEvaluator:
    global _instance
    if _instance is None:
        _instance = AnthropicEvaluator()
    return _instance
