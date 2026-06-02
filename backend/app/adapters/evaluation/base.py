from abc import ABC, abstractmethod


class RuleEvaluator(ABC):
    @abstractmethod
    async def evaluate(
        self,
        tissue_type: str,
        extracted_fields: list[dict],
        ruleset_version: str,
    ) -> dict:
        """
        Evaluate extracted fields against encoded rules.
        Returns the full DonorEvaluation dict (completeness + findings + recommendation + versions).
        """
